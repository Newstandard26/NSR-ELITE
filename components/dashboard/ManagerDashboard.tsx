"use client";

import useSWR from "swr";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";
import type { RepStatsDTO } from "@/lib/types";

interface DashboardData {
  cards: {
    activeTerritories: number; totalLeads: number; knockedToday: number;
    appointmentsToday: number; acculynxThisWeek: number; conversionPct: number;
  };
  reps: RepStatsDTO[];
  pipeline: { stage: string; count: number; color: string }[];
  byDisposition: { label: string; count: number; color: string }[];
  recentActivity: { id: string; type: string; description: string; actor: string | null; createdAt: string; lead: string }[];
}

export function ManagerDashboard() {
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
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardLabel>{card.label}</CardLabel>
            <CardTitle className="mt-1 text-2xl">{card.value ?? "—"}</CardTitle>
          </Card>
        ))}
      </div>

      {(data?.byDisposition?.length ?? 0) > 0 && (
        <Card className="space-y-2">
          <CardLabel>Leads by disposition</CardLabel>
          <div className="flex flex-wrap items-center gap-4">
            <div className="h-48 w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={data!.byDisposition} dataKey="count" nameKey="label" innerRadius={45} outerRadius={75} paddingAngle={2}>
                    {data!.byDisposition.map((d) => <Cell key={d.label} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1 text-sm">
              {data!.byDisposition.map((d) => (
                <li key={d.label} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-zinc-300">{d.label}</span>
                  <span className="text-zinc-500">{d.count}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3">
          <CardLabel>Pipeline</CardLabel>
          {(() => {
            const pipeline = data?.pipeline ?? [];
            const max = Math.max(1, ...pipeline.map((p) => p.count));
            return pipeline.length === 0 ? (
              <p className="text-sm text-zinc-500">No leads yet.</p>
            ) : (
              <div className="space-y-2">
                {pipeline.map((p) => (
                  <div key={p.stage}>
                    <div className="flex justify-between text-xs text-zinc-400"><span>{p.stage}</span><span>{p.count}</span></div>
                    <div className="h-2 rounded-full bg-zinc-800">
                      <div className="h-2 rounded-full" style={{ width: `${(p.count / max) * 100}%`, backgroundColor: p.color }} />
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </Card>

        <Card className="space-y-2">
          <CardLabel>Recent activity</CardLabel>
          <ul className="space-y-2">
            {(data?.recentActivity ?? []).slice(0, 12).map((a) => (
              <li key={a.id} className="text-sm">
                <span className="text-zinc-300">{a.description}</span> <span className="text-zinc-500">— {a.lead}</span>
                <div className="text-xs text-zinc-600">{a.actor ? `${a.actor} · ` : ""}{new Date(a.createdAt).toLocaleString()}</div>
              </li>
            ))}
            {(data?.recentActivity ?? []).length === 0 && <li className="text-sm text-zinc-500">No recent activity.</li>}
          </ul>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Rep Performance (this week)</h2>
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-400">
              <tr>
                <th className="p-3">Rep</th><th className="p-3 text-right">Today</th><th className="p-3 text-right">Week</th>
                <th className="p-3 text-right">Month</th><th className="p-3 text-right">Appts</th><th className="p-3 text-right">AccuLynx</th><th className="p-3 text-right">Conv %</th>
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
