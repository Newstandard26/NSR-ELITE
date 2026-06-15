"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft } from "lucide-react";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";

interface Detail {
  territory: {
    id: string;
    name: string;
    color: string;
    status: string;
    assignments: { user: { id: string; name: string } }[];
  };
  stats: {
    total: number;
    knocked: number;
    byStatus: Record<string, { count: number; color: string }>;
  };
}

export default function TerritoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data } = useSWR<Detail>(`/api/territories/${id}`);

  if (!data) return <div className="p-6 text-zinc-500">Loading…</div>;
  const { territory, stats } = data;
  const entries = Object.entries(stats.byStatus);
  const max = Math.max(1, ...entries.map(([, v]) => v.count));
  const converted = entries.find(([label]) => /converted/i.test(label))?.[1]?.count ?? 0;
  const convRate = stats.total > 0 ? Math.round((converted / stats.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <Link href="/territories" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to territories
      </Link>

      <div className="flex items-center gap-2">
        <span className="h-5 w-5 rounded-full" style={{ backgroundColor: territory.color }} />
        <h1 className="text-xl font-semibold">{territory.name}</h1>
        <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs">{territory.status}</span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardLabel>Total leads</CardLabel><CardTitle className="text-2xl">{stats.total}</CardTitle></Card>
        <Card><CardLabel>Knocked</CardLabel><CardTitle className="text-2xl">{stats.knocked}</CardTitle></Card>
        <Card><CardLabel>Conversion</CardLabel><CardTitle className="text-2xl">{convRate}%</CardTitle></Card>
      </div>

      <Card className="space-y-3">
        <CardLabel>Leads by disposition</CardLabel>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">No leads in this territory yet.</p>
        ) : (
          <div className="space-y-2">
            {entries.map(([label, v]) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-zinc-400"><span>{label}</span><span>{v.count}</span></div>
                <div className="h-2 rounded-full bg-zinc-800">
                  <div className="h-2 rounded-full" style={{ width: `${(v.count / max) * 100}%`, backgroundColor: v.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-2">
        <CardLabel>Assigned reps</CardLabel>
        <p className="text-sm">{territory.assignments.map((a) => a.user.name).join(", ") || "Unassigned"}</p>
      </Card>
    </div>
  );
}
