"use client";

import useSWR from "swr";

interface TerritoryDTO {
  id: string;
  name: string;
  color: string;
  status: string;
  assignments: { user: { id: string; name: string } }[];
  _count: { leads: number };
}

export default function TerritoriesPage() {
  const { data: territories = [] } = useSWR<TerritoryDTO[]>("/api/territories");

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Territories</h1>
      <p className="text-sm text-zinc-500">
        Draw and assign territories from the map (Mapbox Draw). This view lists them with
        coverage and current rep assignments.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {territories.map((t) => (
          <div key={t.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: t.color }} />
              <h2 className="font-semibold">{t.name}</h2>
              <span className="ml-auto rounded bg-zinc-800 px-2 py-0.5 text-xs">{t.status}</span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">{t._count.leads} leads</p>
            <p className="text-xs text-zinc-500">
              Reps: {t.assignments.map((a) => a.user.name).join(", ") || "Unassigned"}
            </p>
          </div>
        ))}
        {territories.length === 0 && (
          <p className="text-sm text-zinc-500">No territories yet.</p>
        )}
      </div>
    </div>
  );
}
