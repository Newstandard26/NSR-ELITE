"use client";

import Link from "next/link";
import useSWR from "swr";
import { Map, Plus, Calendar, Trophy } from "lucide-react";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";
import { DispositionBadge } from "@/components/ui/badge";

interface MeData {
  snapshot: { doorsToday: number; appointmentsToday: number; leadsToday: number; conversionRate: number };
  appointments: { id: string; scheduledAt: string; type: string; lead: { id: string; ownerName: string | null; address: string } | null }[];
  followUps: { id: string; address: string; ownerName: string | null; dispositionStatus: { label: string; color: string; icon: string } | null }[];
  rank: { rank: number | null; total: number; doorsWeek: number };
}

export function RepDashboard() {
  const { data } = useSWR<MeData>("/api/dashboard/me");
  const s = data?.snapshot;

  const cards = [
    { label: "Doors Today", value: s?.doorsToday },
    { label: "Appointments Today", value: s?.appointmentsToday },
    { label: "Leads Today", value: s?.leadsToday },
    { label: "Conversion %", value: s ? `${s.conversionRate}%` : undefined },
  ];

  return (
    <div className="space-y-5">
      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-2">
        <Link href="/map" className="flex flex-col items-center gap-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm hover:bg-zinc-800">
          <Map className="h-5 w-5 text-nsr-blue" /> Map
        </Link>
        <Link href="/leads" className="flex flex-col items-center gap-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm hover:bg-zinc-800">
          <Plus className="h-5 w-5 text-nsr-blue" /> Leads
        </Link>
        <Link href="/appointments" className="flex flex-col items-center gap-1 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm hover:bg-zinc-800">
          <Calendar className="h-5 w-5 text-nsr-blue" /> Appts
        </Link>
      </div>

      {/* Today snapshot */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}><CardLabel>{c.label}</CardLabel><CardTitle className="mt-1 text-2xl">{c.value ?? "—"}</CardTitle></Card>
        ))}
      </div>

      {/* Rank */}
      <Card className="flex items-center gap-3">
        <Trophy className="h-8 w-8 text-yellow-400" />
        <div>
          <CardLabel>Your rank this week</CardLabel>
          <CardTitle className="text-xl">
            {data?.rank.rank ? `#${data.rank.rank} of ${data.rank.total}` : "—"}
            <span className="ml-2 text-sm font-normal text-zinc-400">{data?.rank.doorsWeek ?? 0} doors</span>
          </CardTitle>
        </div>
        <Link href="/leaderboard" className="ml-auto text-sm text-nsr-blue hover:underline">Leaderboard →</Link>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* My appointments */}
        <Card className="space-y-2">
          <CardLabel>My upcoming appointments</CardLabel>
          <ul className="space-y-2">
            {(data?.appointments ?? []).map((a) => (
              <li key={a.id} className="rounded-lg bg-zinc-950 p-2 text-sm">
                <Link href={a.lead ? `/leads/${a.lead.id}` : "#"} className="font-medium hover:text-nsr-blue">
                  {a.lead?.ownerName || a.lead?.address}
                </Link>
                <div className="text-xs text-zinc-500">
                  {new Date(a.scheduledAt).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })} · {a.type}
                </div>
              </li>
            ))}
            {(data?.appointments ?? []).length === 0 && <li className="text-sm text-zinc-500">No upcoming appointments.</li>}
          </ul>
        </Card>

        {/* Follow-ups */}
        <Card className="space-y-2">
          <CardLabel>Follow-ups waiting</CardLabel>
          <ul className="space-y-2">
            {(data?.followUps ?? []).map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-2 rounded-lg bg-zinc-950 p-2 text-sm">
                <Link href={`/leads/${l.id}`} className="truncate hover:text-nsr-blue">{l.ownerName || l.address}</Link>
                {l.dispositionStatus && <DispositionBadge label={l.dispositionStatus.label} color={l.dispositionStatus.color} icon={l.dispositionStatus.icon} />}
              </li>
            ))}
            {(data?.followUps ?? []).length === 0 && <li className="text-sm text-zinc-500">Nothing to revisit. Nice work!</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
