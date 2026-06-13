"use client";

import useSWR from "swr";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";
import type { RepStatsDTO } from "@/lib/types";

interface DashboardData {
  cards: {
    activeTerritories: number;
    totalLeads: number;
    knockedToday: number;
    appointmentsToday: number;
    acculynxThisWeek: number;
    conversionPct: number;
  };
  reps: RepStatsDTO[];
}

export default function DashboardPage() {
  const { data } = useSWR<DashboardData>("/api/dashboard/stats");
  const c = data?.cards;

  const cards = [
    { label: "Active Territories", value: c?.activeTerritories },
    { label: "Total Leads", value: c?.totalLeads },
    { label: "Knocked Today", value: c?.knockedToday },
    { label: "Appointments Today", value: c?.appointmentsToday },
    { label: "AccuLynx Leads (wk)", value: c?.acculynxThisWeek },
    { label: "Conversion %", value: c ? `${c.conversionPct}%` : undefined },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <h1 className="text-xl font-semibold">Manager Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardLabel>{card.label}</CardLabel>
            <CardTitle className="mt-1 text-2xl">{card.value ?? "—"}</CardTitle>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Rep Performance (this week)</h2>
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-400">
              <tr>
                <th className="p-3">Rep</th>
                <th className="p-3 text-right">Today</th>
                <th className="p-3 text-right">Week</th>
                <th className="p-3 text-right">Month</th>
                <th className="p-3 text-right">Appts</th>
                <th className="p-3 text-right">AccuLynx</th>
                <th className="p-3 text-right">Conv %</th>
              </tr>
            </thead>
            <tbody>
              {(data?.reps ?? []).map((r) => (
                <tr key={r.repId} className="border-t border-zinc-800">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-right">{r.knockedToday}</td>
                  <td className="p-3 text-right">{r.knockedWeek}</td>
                  <td className="p-3 text-right">{r.knockedMonth}</td>
                  <td className="p-3 text-right">{r.appointmentsSet}</td>
                  <td className="p-3 text-right">{r.acculynxLeads}</td>
                  <td className="p-3 text-right">{r.conversionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
