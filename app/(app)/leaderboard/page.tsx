"use client";

import useSWR from "swr";
import { Trophy } from "lucide-react";
import type { RepStatsDTO } from "@/lib/types";

export default function LeaderboardPage() {
  const { data } = useSWR<{ leaderboard: RepStatsDTO[] }>("/api/leaderboard");
  const rows = data?.leaderboard ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Leaderboard</h1>
      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-400">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">Rep</th>
              <th className="p-3 text-right">Today</th>
              <th className="p-3 text-right">Week</th>
              <th className="p-3 text-right">Appts</th>
              <th className="p-3 text-right">AccuLynx</th>
              <th className="p-3 text-right">Conv %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.repId} className="border-t border-zinc-800">
                <td className="p-3">
                  {r.isTopPerformer ? (
                    <Trophy className="h-4 w-4 text-yellow-400" />
                  ) : (
                    r.rank
                  )}
                </td>
                <td className="p-3 font-medium">{r.name}</td>
                <td className="p-3 text-right">{r.knockedToday}</td>
                <td className="p-3 text-right">{r.knockedWeek}</td>
                <td className="p-3 text-right">{r.appointmentsSet}</td>
                <td className="p-3 text-right">{r.acculynxLeads}</td>
                <td className="p-3 text-right">{r.conversionRate}%</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-zinc-500">
                  No activity yet this week.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
