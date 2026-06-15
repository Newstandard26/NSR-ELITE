"use client";

import { useState } from "react";
import useSWR from "swr";
import { Trophy, ArrowUp, ArrowDown, Minus } from "lucide-react";

interface Row {
  repId: string; name: string; doors: number; appointmentsSet: number;
  acculynxLeads: number; conversionRate: number; rank: number; movement: number; isTopPerformer: boolean;
}

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All Time" },
] as const;

export default function LeaderboardPage() {
  const [range, setRange] = useState<string>("week");
  const [territory, setTerritory] = useState("");
  const { data: territories = [] } = useSWR<{ id: string; name: string }[]>("/api/territories");
  const qs = new URLSearchParams({ range });
  if (territory) qs.set("territory", territory);
  const { data } = useSWR<{ leaderboard: Row[] }>(`/api/leaderboard?${qs.toString()}`);
  const rows = data?.leaderboard ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Leaderboard</h1>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-xl border border-zinc-800 p-1">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`rounded-lg px-3 py-1 text-sm ${range === r.key ? "bg-nsr-blue text-black" : "text-zinc-300"}`}>
              {r.label}
            </button>
          ))}
        </div>
        <select value={territory} onChange={(e) => setTerritory(e.target.value)} className="h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm">
          <option value="">All territories</option>
          {territories.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-400">
            <tr>
              <th className="p-3">#</th><th className="p-3">Rep</th>
              <th className="p-3 text-right">Doors</th><th className="p-3 text-right">Appts</th>
              <th className="p-3 text-right">AccuLynx</th><th className="p-3 text-right">Conv %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.repId} className="border-t border-zinc-800">
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {r.isTopPerformer ? <Trophy className="h-4 w-4 text-yellow-400" /> : r.rank}
                    {r.movement > 0 && <span className="flex items-center text-green-400"><ArrowUp className="h-3 w-3" />{r.movement}</span>}
                    {r.movement < 0 && <span className="flex items-center text-red-400"><ArrowDown className="h-3 w-3" />{-r.movement}</span>}
                    {r.movement === 0 && <Minus className="h-3 w-3 text-zinc-600" />}
                  </div>
                </td>
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-right">{r.doors}</td>
                <td className="p-3 text-right">{r.appointmentsSet}</td>
                <td className="p-3 text-right">{r.acculynxLeads}</td>
                <td className="p-3 text-right">{r.conversionRate}%</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No activity in this range.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
