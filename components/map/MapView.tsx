"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { LocateFixed, Flame, Filter, Plus, Search, MapPin, Radio, Users } from "lucide-react";
import { LeadCardDrawer } from "./LeadCardDrawer";
import { MapFilterBar, type MapFilters } from "./MapFilterBar";
import { LeadForm } from "@/components/leads/LeadForm";
import { getCurrentPosition } from "@/lib/native";
import type { DispositionStatusDTO, LeadDTO } from "@/lib/types";

interface TerritoryDTO {
  id: string;
  name: string;
  color: string;
  geoJson: unknown;
}

// Mapbox satellite-streets, dark variant.
const MAP_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";
// Roscoe, IL — NSR home base.
const DEFAULT_CENTER: [number, number] = [-89.0937, 42.4111];

interface RepPing {
  repId: string;
  name: string;
  lat: number;
  lng: number;
  lastSeen: string;
}

export function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const repMarkersRef = useRef<mapboxgl.Marker[]>([]);

  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<MapFilters>({});
  const [addingLead, setAddingLead] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<{ placeId: string; description: string }[]>([]);
  const searchMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const { data: statuses = [] } = useSWR<DispositionStatusDTO[]>("/api/disposition-statuses");
  const { data: territories = [] } = useSWR<TerritoryDTO[]>("/api/territories");
  const { data: session } = useSession();
  const isManager = session?.user?.role === "MANAGER" || session?.user?.role === "ADMIN";

  // Live location: reps broadcast their position while sharing; managers/admins
  // see everyone's latest position, refreshed every 30s.
  const [sharing, setSharing] = useState(false);
  const [showReps, setShowReps] = useState(true);
  const { data: repLocations = [] } = useSWR<RepPing[]>(
    isManager && showReps ? "/api/reps/locations" : null,
    { refreshInterval: 30_000 },
  );

  // Build the leads query string from active filters.
  const leadsQuery = useMemo(() => {
    const qs = new URLSearchParams();
    if (filters.status) qs.set("status", filters.status);
    if (filters.rep) qs.set("rep", filters.rep);
    if (filters.territory) qs.set("territory", filters.territory);
    if (filters.dateFrom) qs.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) qs.set("dateTo", filters.dateTo);
    return qs.toString();
  }, [filters]);

  const { data: leads = [], mutate: refetchLeads } = useSWR<LeadDTO[]>(
    `/api/leads${leadsQuery ? `?${leadsQuery}` : ""}`,
  );

  // Refs so the one-time map click handler always sees current values.
  const [dropMode, setDropMode] = useState(false);
  const [locConsentOpen, setLocConsentOpen] = useState(false);
  const dropModeRef = useRef(false);
  const refetchRef = useRef(refetchLeads);
  refetchRef.current = refetchLeads;
  useEffect(() => {
    dropModeRef.current = dropMode;
    const map = mapRef.current;
    if (map) map.getCanvas().style.cursor = dropMode ? "crosshair" : "";
  }, [dropMode]);

  // Resume sharing if the rep consented and didn't turn it off.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (
      localStorage.getItem("nsr_loc_consent") === "1" &&
      localStorage.getItem("nsr_loc_share") !== "0"
    ) {
      setSharing(true);
    }
  }, []);

  // While sharing, broadcast position now and every 60s (foreground only).
  useEffect(() => {
    if (!sharing) return;
    let cancelled = false;
    const ping = async () => {
      try {
        const { lat, lng } = await getCurrentPosition();
        if (cancelled) return;
        fetch("/api/reps/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        }).catch(() => {});
      } catch {
        /* ignore — rep may have denied the OS prompt */
      }
    };
    ping();
    const id = window.setInterval(ping, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [sharing]);

  // --- Initialize map once ---
  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("NEXT_PUBLIC_MAPBOX_TOKEN is not set");
      return;
    }
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: 13,
      attributionControl: false,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;

    // Tap-to-drop: in drop mode, clicking the map creates a lead at that point.
    map.on("click", async (e) => {
      if (!dropModeRef.current) return;
      const { lng, lat } = e.lngLat;
      try {
        const res = await fetch("/api/leads/drop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        });
        if (res.ok) {
          const lead = await res.json();
          await refetchRef.current();
          setSelectedLead(lead.id);
        }
      } catch {
        /* ignore */
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // --- Render lead pins whenever leads or dispositions change ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const renderMarkers = () => {
      // Clear existing DOM markers.
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      for (const lead of leads) {
        if (!lead.lat && !lead.lng) continue; // skip un-geocoded
        const icon = lead.dispositionStatus?.icon || "🔵";

        // Simple round emoji marker (the disposition's colored circle). A <div>
        // (not a <button>) so it stays perfectly round on mobile Safari.
        const el = document.createElement("div");
        el.className = "nsr-pin";
        el.textContent = icon;
        el.style.cssText =
          "font-size:28px;line-height:1;cursor:pointer;user-select:none;-webkit-user-select:none;filter:drop-shadow(0 1px 2px rgba(0,0,0,.7));";
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", lead.ownerName || lead.address);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          setSelectedLead(lead.id);
        });

        // Pins are locked to where they were dropped — never draggable — so a
        // stray touch while panning can't move a lead's location.
        const marker = new mapboxgl.Marker({ element: el, draggable: false })
          .setLngLat([lead.lng, lead.lat])
          .addTo(map);
        markersRef.current.push(marker);
      }
    };

    if (map.isStyleLoaded()) renderMarkers();
    else map.once("load", renderMarkers);
  }, [leads, isManager]);

  // --- Live rep location markers (managers/admins only) ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      repMarkersRef.current.forEach((m) => m.remove());
      repMarkersRef.current = [];
      if (!isManager || !showReps) return;

      const now = Date.now();
      for (const r of repLocations) {
        if (r.repId === session?.user?.id) continue; // don't pin yourself
        const ageMin = (now - new Date(r.lastSeen).getTime()) / 60_000;
        if (ageMin > 30) continue; // not "live" anymore
        const live = ageMin < 5;

        const el = document.createElement("div");
        el.style.cssText = `display:flex;align-items:center;gap:5px;padding:3px 9px 3px 6px;border-radius:9999px;background:rgba(9,9,11,.85);border:1px solid ${live ? "#22C55E" : "#52525b"};box-shadow:0 1px 4px rgba(0,0,0,.5);white-space:nowrap;opacity:${live ? 1 : 0.65};cursor:default;`;
        const dot = document.createElement("span");
        dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${live ? "#22C55E" : "#9ca3af"};box-shadow:${live ? "0 0 0 3px rgba(34,197,94,.3)" : "none"};`;
        const name = document.createElement("span");
        name.style.cssText = "font-size:11px;font-weight:600;color:#fff;";
        name.textContent = r.name.split(" ")[0];
        el.appendChild(dot);
        el.appendChild(name);
        el.title = `${r.name} · ${ageMin < 1 ? "just now" : `${Math.round(ageMin)}m ago`}`;

        const marker = new mapboxgl.Marker({ element: el }).setLngLat([r.lng, r.lat]).addTo(map);
        repMarkersRef.current.push(marker);
      }
    };

    if (map.isStyleLoaded()) render();
    else map.once("load", render);
  }, [repLocations, isManager, showReps, session?.user?.id]);

  // --- Territory polygon overlay ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const geojson = {
        type: "FeatureCollection",
        features: territories
          .filter((t) => t.geoJson)
          .map((t) => ({
            type: "Feature",
            geometry: t.geoJson,
            properties: { color: t.color, name: t.name },
          })),
      };
      if (map.getSource("territories")) {
        (map.getSource("territories") as mapboxgl.GeoJSONSource).setData(geojson as never);
      } else {
        map.addSource("territories", { type: "geojson", data: geojson as never });
        map.addLayer({
          id: "territory-fill",
          type: "fill",
          source: "territories",
          paint: { "fill-color": ["get", "color"], "fill-opacity": 0.12 },
        });
        map.addLayer({
          id: "territory-line",
          type: "line",
          source: "territories",
          paint: { "line-color": ["get", "color"], "line-width": 2 },
        });
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [territories]);

  // --- Heatmap toggle ---
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const apply = () => {
      const geojson = {
        type: "FeatureCollection",
        features: leads
          .filter((l) => l.lat || l.lng)
          .map((l) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [l.lng, l.lat] },
            properties: {},
          })),
      };

      if (map.getSource("knocks")) {
        (map.getSource("knocks") as mapboxgl.GeoJSONSource).setData(geojson as never);
      } else {
        map.addSource("knocks", { type: "geojson", data: geojson as never });
        map.addLayer({
          id: "knock-heat",
          type: "heatmap",
          source: "knocks",
          paint: {
            "heatmap-radius": 30,
            "heatmap-intensity": 1,
            "heatmap-opacity": 0.7,
          },
        });
      }
      map.setLayoutProperty("knock-heat", "visibility", showHeatmap ? "visible" : "none");
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [showHeatmap, leads]);

  // --- Address search ---
  async function runSearch(q: string) {
    setSearchQ(q);
    if (q.trim().length < 3) {
      setSearchResults([]);
      return;
    }
    const res = await fetch(`/api/places/autocomplete?q=${encodeURIComponent(q)}`);
    const data = await res.json().catch(() => ({}));
    setSearchResults(data.predictions || []);
  }
  async function gotoSearchResult(placeId: string, description: string) {
    setSearchResults([]);
    setSearchQ(description);
    const res = await fetch(`/api/places/details?placeId=${encodeURIComponent(placeId)}`);
    if (!res.ok) return;
    const d = await res.json();
    const map = mapRef.current;
    if (!map || !d.lat) return;
    map.flyTo({ center: [d.lng, d.lat], zoom: 16 });
    searchMarkerRef.current?.remove();
    const el = document.createElement("div");
    el.style.cssText = "width:16px;height:16px;border-radius:50%;background:#fff;border:3px solid #51C5F4;";
    searchMarkerRef.current = new mapboxgl.Marker({ element: el }).setLngLat([d.lng, d.lat]).addTo(map);
  }

  // --- GPS: center on rep location (native plugin on device, browser on web) ---
  // Show a prominent disclosure + consent before the first location request.
  async function showMyLocation() {
    if (typeof window !== "undefined" && localStorage.getItem("nsr_loc_consent") !== "1") {
      setLocConsentOpen(true);
      return;
    }
    await runLocation();
  }

  function grantLocationConsent() {
    localStorage.setItem("nsr_loc_consent", "1");
    localStorage.setItem("nsr_loc_share", "1");
    setLocConsentOpen(false);
    setSharing(true); // start broadcasting live location to managers
    runLocation();
  }

  // Toggle live location sharing on/off (requires consent the first time).
  function toggleSharing() {
    if (sharing) {
      localStorage.setItem("nsr_loc_share", "0");
      setSharing(false);
      return;
    }
    if (typeof window !== "undefined" && localStorage.getItem("nsr_loc_consent") !== "1") {
      setLocConsentOpen(true);
      return;
    }
    localStorage.setItem("nsr_loc_share", "1");
    setSharing(true);
  }

  async function runLocation() {
    let latitude: number, longitude: number;
    try {
      ({ lat: latitude, lng: longitude } = await getCurrentPosition());
    } catch {
      return alert("Could not get your location");
    }
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [longitude, latitude], zoom: 15 });
    if (userMarkerRef.current) userMarkerRef.current.remove();
    const el = document.createElement("div");
    el.style.cssText =
      "width:18px;height:18px;border-radius:50%;background:#51C5F4;border:3px solid #fff;box-shadow:0 0 0 6px rgba(81,197,244,.3);";
    userMarkerRef.current = new mapboxgl.Marker({ element: el })
      .setLngLat([longitude, latitude])
      .addTo(map);

    // Log the ping (best effort).
    fetch("/api/reps/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: latitude, lng: longitude }),
    }).catch(() => {});
  }

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Top filter bar */}
      <div className="absolute inset-x-0 top-0 z-10 p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex h-11 items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 text-sm backdrop-blur"
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
          {/* Address search */}
          <div className="relative flex-1 max-w-md">
            <div className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 backdrop-blur">
              <Search className="h-4 w-4 text-zinc-400" />
              <input
                value={searchQ}
                onChange={(e) => runSearch(e.target.value)}
                placeholder="Search an address…"
                className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
              />
            </div>
            {searchResults.length > 0 && (
              <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
                {searchResults.map((r) => (
                  <li key={r.placeId}>
                    <button onClick={() => gotoSearchResult(r.placeId, r.description)} className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-800">
                      {r.description}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <span className="hidden rounded-xl border border-zinc-700 bg-zinc-900/90 px-3 py-2 text-xs text-zinc-300 backdrop-blur sm:inline">
            {leads.length} leads
          </span>
        </div>
        {showFilters && (
          <MapFilterBar
            statuses={statuses}
            filters={filters}
            onChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        )}
      </div>

      {/* Floating controls */}
      <div className="absolute bottom-24 right-3 z-10 flex flex-col gap-2 sm:bottom-6">
        <button
          onClick={() => setDropMode((v) => !v)}
          aria-label="Drop pin mode"
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 backdrop-blur ${
            dropMode ? "bg-nsr-blue text-black" : "bg-zinc-900/90 text-white"
          }`}
        >
          <MapPin className="h-5 w-5" />
        </button>
        <button
          onClick={() => setShowHeatmap((v) => !v)}
          aria-label="Toggle heatmap"
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 backdrop-blur ${
            showHeatmap ? "bg-nsr-blue text-black" : "bg-zinc-900/90 text-white"
          }`}
        >
          <Flame className="h-5 w-5" />
        </button>
        <button
          onClick={showMyLocation}
          aria-label="Show my location"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/90 text-white backdrop-blur"
        >
          <LocateFixed className="h-5 w-5" />
        </button>
        <button
          onClick={toggleSharing}
          aria-label={sharing ? "Stop sharing my location" : "Share my live location"}
          title={sharing ? "Sharing your live location" : "Share your live location"}
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 backdrop-blur ${
            sharing ? "bg-green-500 text-black" : "bg-zinc-900/90 text-white"
          }`}
        >
          <Radio className="h-5 w-5" />
        </button>
        {isManager && (
          <button
            onClick={() => setShowReps((v) => !v)}
            aria-label="Toggle live rep locations"
            title="Show reps' live locations"
            className={`flex h-11 w-11 items-center justify-center rounded-full border border-zinc-700 backdrop-blur ${
              showReps ? "bg-nsr-blue text-black" : "bg-zinc-900/90 text-white"
            }`}
          >
            <Users className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Drop-mode hint */}
      {dropMode && (
        <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center">
          <span className="rounded-full bg-nsr-blue px-4 py-1.5 text-sm font-semibold text-black shadow-lg">
            Tap a house to drop a pin
          </span>
        </div>
      )}

      {/* Add Lead FAB */}
      <button
        onClick={() => setAddingLead(true)}
        aria-label="Add lead"
        className="absolute bottom-24 left-3 z-10 flex h-12 w-12 items-center justify-center rounded-full bg-nsr-blue text-black shadow-lg sm:bottom-6"
      >
        <Plus className="h-6 w-6" />
      </button>

      {addingLead && <LeadForm onClose={() => setAddingLead(false)} onCreated={() => refetchLeads()} />}

      {selectedLead && (
        <LeadCardDrawer
          leadId={selectedLead}
          statuses={statuses}
          onClose={() => setSelectedLead(null)}
          onChanged={() => refetchLeads()}
        />
      )}

      {locConsentOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-center">
            <MapPin className="mx-auto h-8 w-8 text-nsr-blue" />
            <h3 className="text-lg font-semibold">Use your location</h3>
            <p className="text-sm text-zinc-400">
              NSR Elite uses your device location to show you on the canvassing map, log the doors you
              knock, and—while you&apos;re on the map—share your live position with your managers.
              Location is collected <strong>only while you&apos;re using the app</strong> — never in the
              background. You can stop sharing anytime with the broadcast button.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setLocConsentOpen(false)}
                className="flex-1 rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
              >
                Not now
              </button>
              <button
                onClick={grantLocationConsent}
                className="flex-1 rounded-xl bg-nsr-blue px-4 py-2.5 text-sm font-semibold text-black"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
