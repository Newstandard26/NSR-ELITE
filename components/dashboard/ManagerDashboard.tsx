"use client";

import { useState } from "react";
import useSWR from "swr";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Radio } from "lucide-react";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";

interface RepRow { repId: string; name: string; doors: number; appointmentsSet: number; acculynxLeads: number; conversionRate: number }
interface DashboardData {
  cards: { activeTerritories: number; totalLeads: number; knocked: number; appointments: number; acculynx: number; conversionPct: number };
  reps: RepRow[];
  pipeline: { stage: string; count: number; color: string }[];
  byDisposition: { label: string; count: number; color: string }[];
  recentActivity: { id: string; description: string; createdAt: string; actor: string | null; lead: string }[];
  liveReps: { id: string; name: string; lastSeen: string }[];
}

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All" },
] as const;

export function ManagerDashboard() {
  const [range, setRange] = useState<string>("week");
  const { data } = useSWR<DashboardData>(`/api/dashboard/stats?range=${range}`);
  const c = data?.cards;

  const cards = [
    { label: "Active Territories", value: c?.activeTerritories },
    { label: "Total Leads", value: c?.totalLeads },
    { label: "Knocked", value: c?.knocked },
    { label: "Appointments", value: c?.appointments },
    { label: "AccuLynx Leads", value: c?.acculynx },
    { label: "Conversion %", value: c ? `${c.conversionPct}%` : undefined },
  ];

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-xl border border-zinc-800 p-1 w-fit">
        {RANGES.map((r) => (
          <button key={r.key} onClick={() => setRange(r.key)}
            className={`rounded-lg px-3 py-1 text-sm ${range === r.key ? "bg-nsr-blue text-black" : "text-zinc-300"}`}>
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardLabel>{card.label}</CardLabel>
            <CardTitle className="mt-1 text-2xl">{card.value ?? "—"}</CardTitle>
          </Card>
        ))}
      </div>

      {/* Live reps today */}
      <Card className="space-y-2">
        <CardLabel className="flex items-center gap-1"><Radio className="h-3.5 w-3.5 text-green-400" /> Live reps today</CardLabel>
        {(data?.liveReps?.length ?? 0) === 0 ? (
          <p className="text-sm text-zinc-500">No GPS check-ins yet today.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data!.liveReps.map((r) => (
              <span key={r.id} className="flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                {r.name}
                <span className="text-xs text-zinc-500">{new Date(r.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </span>
            ))}
          </div>
        )}
      </Card>

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
                  <span className="text-zinc-300">{d.label}</span><span className="text-zinc-500">{d.count}</span>
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
            return pipeline.length === 0 ? <p className="text-sm text-zinc-500">No leads in range.</p> : (
              <div className="space-y-2">
                {pipeline.map((p) => (
                  <div key={p.stage}>
                    <div className="flex justify-between text-xs text-zinc-400"><span>{p.stage}</span><span>{p.count}</span></div>
                    <div className="h-2 rounded-full bg-zinc-800"><div className="h-2 rounded-full" style={{ width: `${(p.count / max) * 100}%`, backgroundColor: p.color }} /></div>
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
            {(data?.recentActivity ?? []).length === 0 && <li className="text-sm text-zinc-500">No activity in range.</li>}
          </ul>
        </Card>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Rep Performance</h2>
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-400">
              <tr>
                <th className="p-3">Rep</th><th className="p-3 text-right">Doors</th>
                <th className="p-3 text-right">Appts</th><th className="p-3 text-right">AccuLynx</th><th className="p-3 text-right">Conv %</th>
              </tr>
            </thead>
            <tbody>
              {(data?.reps ?? []).map((r) => (
                <tr key={r.repId} className="border-t border-zinc-800">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3 text-right">{r.doors}</td>
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
