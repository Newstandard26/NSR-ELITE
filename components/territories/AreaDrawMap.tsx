"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import useSWR from "swr";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RepStatsDTO } from "@/lib/types";

const MAP_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";
const DEFAULT_CENTER: [number, number] = [-89.0937, 42.4111];

// Full-screen polygon-draw flow for creating a territory/area.
export function AreaDrawMap({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);

  const [name, setName] = useState("");
  const [color, setColor] = useState("#51C5F4");
  const [repIds, setRepIds] = useState<string[]>([]);
  const [hasPolygon, setHasPolygon] = useState(false);
  const [busy, setBusy] = useState(false);
  const [drawingMode, setDrawingMode] = useState(false);

  const { data: reps = [] } = useSWR<RepStatsDTO[]>("/api/reps");

  function startDrawing() {
    drawRef.current?.changeMode("draw_polygon");
    setDrawingMode(true);
  }
  function clearPolygon() {
    drawRef.current?.deleteAll();
    setHasPolygon(false);
    setDrawingMode(false);
  }

  useEffect(() => {
    if (mapRef.current || !container.current) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: container.current,
      style: MAP_STYLE,
      center: DEFAULT_CENTER,
      zoom: 13,
      attributionControl: false,
    });
    const draw = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: true, trash: true },
    });
    map.addControl(draw);
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    const sync = () => {
      setHasPolygon(draw.getAll().features.length > 0);
      setDrawingMode(false);
    };
    map.on("draw.create", sync);
    map.on("draw.delete", sync);
    map.on("draw.update", sync);

    mapRef.current = map;
    drawRef.current = draw;
    return () => {
      map.remove();
      mapRef.current = null;
      drawRef.current = null;
    };
  }, []);

  async function save() {
    const fc = drawRef.current?.getAll();
    const feature = fc?.features[0];
    if (!feature || !name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch("/api/territories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color, status: "ACTIVE", geoJson: feature.geometry }),
      });
      const territory = await res.json();
      if (res.ok && repIds.length > 0) {
        await fetch(`/api/territories/${territory.id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: repIds }),
        });
      }
      onSaved();
      onClose();
    } finally {
      setBusy(false);
    }
  }

  function toggleRep(id: string) {
    setRepIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-black">
      <div ref={container} className="flex-1" />
      <div className="w-80 shrink-0 space-y-4 overflow-y-auto border-l border-zinc-800 bg-zinc-900 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">New Area</h2>
          <button onClick={onClose} aria-label="Close" className="p-2 hover:bg-zinc-800 rounded-full">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
          {!hasPolygon ? (
            <>
              <Button className="w-full" onClick={startDrawing} disabled={drawingMode}>
                {drawingMode ? "Drawing… click points on the map" : "✏️ Draw polygon"}
              </Button>
              <p className="text-xs text-zinc-400">
                Click the button, then click points on the map to trace the territory.
                Double-click (or click the first point) to finish.
              </p>
            </>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-400">✓ Polygon drawn</span>
              <Button size="sm" variant="secondary" onClick={clearPolygon}>Redraw</Button>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-zinc-400">Area name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Roscoe Blitz East" />
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-zinc-400">Color</label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-16 cursor-pointer rounded-lg border border-zinc-700 bg-transparent"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-zinc-400">Assign reps</label>
          <div className="flex flex-wrap gap-2">
            {reps.map((r) => (
              <button
                key={r.repId}
                onClick={() => toggleRep(r.repId)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  repIds.includes(r.repId)
                    ? "border-nsr-blue bg-nsr-blue/10 text-nsr-blue"
                    : "border-zinc-700 text-zinc-300"
                }`}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        <Button className="w-full" onClick={save} disabled={busy || !hasPolygon || !name.trim()}>
          {busy ? "Saving…" : "Save Area"}
        </Button>
        {!hasPolygon && <p className="text-xs text-zinc-500">Draw a polygon to enable saving.</p>}
      </div>
    </div>
  );
}
