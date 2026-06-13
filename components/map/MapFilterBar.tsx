"use client";

import useSWR from "swr";
import { X } from "lucide-react";
import type { DispositionStatusDTO, RepStatsDTO } from "@/lib/types";

export interface MapFilters {
  status?: string;
  rep?: string;
  territory?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface TerritoryLite {
  id: string;
  name: string;
}

export function MapFilterBar({
  statuses,
  filters,
  onChange,
  onClose,
}: {
  statuses: DispositionStatusDTO[];
  filters: MapFilters;
  onChange: (f: MapFilters) => void;
  onClose: () => void;
}) {
  const { data: reps = [] } = useSWR<RepStatsDTO[]>("/api/reps");
  const { data: territories = [] } = useSWR<TerritoryLite[]>("/api/territories");

  const set = (patch: Partial<MapFilters>) => onChange({ ...filters, ...patch });

  return (
    <div className="mt-2 space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/95 p-3 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">Filter pins</span>
        <button onClick={onClose} aria-label="Close filters" className="p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <select
        value={filters.status ?? ""}
        onChange={(e) => set({ status: e.target.value || undefined })}
        className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
      >
        <option value="">All dispositions {`(${statuses.length})`}</option>
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>
            {s.icon} {s.label} {s.isActive ? "" : "(Archived)"}
          </option>
        ))}
      </select>

      <select
        value={filters.rep ?? ""}
        onChange={(e) => set({ rep: e.target.value || undefined })}
        className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
      >
        <option value="">All reps</option>
        {reps.map((r) => (
          <option key={r.repId} value={r.repId}>
            {r.name}
          </option>
        ))}
      </select>

      <select
        value={filters.territory ?? ""}
        onChange={(e) => set({ territory: e.target.value || undefined })}
        className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
      >
        <option value="">All territories</option>
        {territories.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>

      <div className="flex gap-2">
        <input
          type="date"
          value={filters.dateFrom ?? ""}
          onChange={(e) => set({ dateFrom: e.target.value || undefined })}
          className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
        />
        <input
          type="date"
          value={filters.dateTo ?? ""}
          onChange={(e) => set({ dateTo: e.target.value || undefined })}
          className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
        />
      </div>

      <button
        onClick={() => onChange({})}
        className="w-full rounded-lg border border-zinc-700 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
      >
        Clear filters
      </button>
    </div>
  );
}
