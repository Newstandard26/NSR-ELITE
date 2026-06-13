"use client";

import dynamic from "next/dynamic";

// Map is client-only (mapbox-gl touches window).
const MapView = dynamic(() => import("@/components/map/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center text-zinc-500">Loading map…</div>
  ),
});

export default function MapPage() {
  return <MapView />;
}
