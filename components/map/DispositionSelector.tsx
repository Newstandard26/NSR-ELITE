"use client";

import { contrastText } from "@/lib/utils";
import type { DispositionStatusDTO } from "@/lib/types";

// Dropdown of active dispositions, sorted by sortOrder. Driven entirely by the
// DispositionStatus table — never hardcoded.
export function DispositionSelector({
  statuses,
  value,
  onChange,
  disabled,
}: {
  statuses: DispositionStatusDTO[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const active = statuses.filter((s) => s.isActive).sort((a, b) => a.sortOrder - b.sortOrder);
  const current = statuses.find((s) => s.id === value);

  return (
    <div className="space-y-1">
      <label className="text-xs uppercase tracking-wide text-zinc-400">Disposition</label>
      <div className="relative">
        <select
          disabled={disabled}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 w-full appearance-none rounded-xl border border-zinc-700 bg-zinc-950 px-3 pr-9 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nsr-blue"
          style={
            current
              ? { backgroundColor: current.color, color: contrastText(current.color) }
              : undefined
          }
        >
          <option value="" disabled>
            Select disposition…
          </option>
          {active.map((s) => (
            <option key={s.id} value={s.id} className="bg-zinc-950 text-white">
              {s.icon} {s.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
