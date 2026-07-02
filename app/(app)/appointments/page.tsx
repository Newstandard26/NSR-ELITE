"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { BrandWatermark } from "@/components/BrandWatermark";
import type { RepStatsDTO, LeadDTO } from "@/lib/types";

interface ApptDTO {
  id: string;
  scheduledAt: string;
  type: string;
  durationMinutes: number;
  notes: string | null;
  status: string;
  rep: { id: string; name: string } | null;
  lead: { id: string; address: string; ownerName: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "Upcoming",
  COMPLETED: "Completed",
  CANCELLED: "Canceled",
};

function AppointmentsContent() {
  const [filters, setFilters] = useState<{ rep?: string; status?: string; from?: string; to?: string }>({});
  const rangeParam = useSearchParams().get("range");
  const qs = new URLSearchParams();
  if (filters.rep) qs.set("rep", filters.rep);
  if (filters.status) qs.set("status", filters.status);
  if (filters.from) qs.set("from", filters.from);
  if (filters.to) qs.set("to", filters.to);
  if (rangeParam) qs.set("range", rangeParam);
  const { data: appts = [], mutate } = useSWR<ApptDTO[]>(`/api/appointments?${qs.toString()}`);
  const { data: reps = [] } = useSWR<RepStatsDTO[]>("/api/reps");
  const [scheduling, setScheduling] = useState(false);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    mutate();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <BrandWatermark />
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Appointments</h1>
        <Button onClick={() => setScheduling(true)}>
          <Plus className="h-4 w-4" /> Schedule
        </Button>
      </div>
      {rangeParam && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-nsr-blue/40 bg-nsr-blue/5 px-3 py-2 text-sm">
          <span className="text-zinc-300">
            Showing appointments {rangeParam === "week" ? "this week" : rangeParam === "month" ? "this month" : "today"}
          </span>
          <Link href="/appointments" className="shrink-0 font-medium text-nsr-blue hover:underline">
            View all
          </Link>
        </div>
      )}

      {scheduling && <ScheduleModal reps={reps} onClose={() => setScheduling(false)} onSaved={() => mutate()} />}

      <div className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 sm:grid-cols-4">
        <select value={filters.rep ?? ""} onChange={(e) => setFilters((f) => ({ ...f, rep: e.target.value || undefined }))} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm">
          <option value="">All reps</option>
          {reps.map((r) => <option key={r.repId} value={r.repId}>{r.name}</option>)}
        </select>
        <select value={filters.status ?? ""} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm">
          <option value="">All statuses</option>
          <option value="SCHEDULED">Upcoming</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Canceled</option>
        </select>
        <input type="date" value={filters.from ?? ""} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value || undefined }))} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm" />
        <input type="date" value={filters.to ?? ""} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value || undefined }))} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-400">
            <tr>
              <th className="p-3">When</th><th className="p-3">Homeowner</th><th className="p-3">Address</th>
              <th className="p-3">Rep</th><th className="p-3">Status</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {appts.map((a) => (
              <tr key={a.id} className="border-t border-zinc-800">
                <td className="p-3">{new Date(a.scheduledAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}<div className="text-xs text-zinc-500">{a.type} · {a.durationMinutes}m</div></td>
                <td className="p-3">{a.lead?.ownerName || "—"}</td>
                <td className="p-3 text-zinc-400">{a.lead?.address}</td>
                <td className="p-3 text-zinc-400">{a.rep?.name}</td>
                <td className="p-3"><span className={`rounded px-2 py-0.5 text-xs ${a.status === "COMPLETED" ? "bg-green-900 text-green-300" : a.status === "CANCELLED" ? "bg-red-900 text-red-300" : "bg-zinc-800 text-zinc-300"}`}>{STATUS_LABEL[a.status] ?? a.status}</span></td>
                <td className="p-3">
                  <div className="flex items-center gap-2 text-xs">
                    {a.status === "SCHEDULED" && (
                      <>
                        <button onClick={() => setStatus(a.id, "COMPLETED")} className="text-green-400 hover:underline">Complete</button>
                        <button onClick={() => setStatus(a.id, "CANCELLED")} className="text-red-400 hover:underline">Cancel</button>
                      </>
                    )}
                    {a.lead && <Link href={`/leads/${a.lead.id}`} className="text-nsr-blue hover:underline">Lead</Link>}
                  </div>
                </td>
              </tr>
            ))}
            {appts.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-zinc-500">No appointments. Click Schedule to add one.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScheduleModal({ reps, onClose, onSaved }: { reps: RepStatsDTO[]; onClose: () => void; onSaved: () => void }) {
  const [leadSearch, setLeadSearch] = useState("");
  const { data: leads = [] } = useSWR<LeadDTO[]>(leadSearch.length >= 2 ? `/api/leads?search=${encodeURIComponent(leadSearch)}` : null);
  const [leadId, setLeadId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [type, setType] = useState("INSPECTION");
  const [repId, setRepId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!leadId || !date || !time) return;
    setBusy(true);
    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        scheduledAt: new Date(`${date}T${time}`).toISOString(),
        type,
        durationMinutes: duration,
        repId: repId || undefined,
        notes: notes || undefined,
      }),
    });
    setBusy(false);
    onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="animate-slide-up max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-900 p-4 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Schedule Appointment</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-400">Lead</label>
          <Input value={leadSearch} onChange={(e) => { setLeadSearch(e.target.value); setLeadId(""); }} placeholder="Search homeowner or address…" />
          {leadSearch.length >= 2 && !leadId && (
            <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-zinc-700">
              {leads.slice(0, 8).map((l) => (
                <button key={l.id} onClick={() => { setLeadId(l.id); setLeadSearch(`${l.ownerName || l.address}`); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-800">
                  {l.ownerName || "—"} · <span className="text-zinc-400">{l.address}</span>
                </button>
              ))}
              {leads.length === 0 && <p className="px-3 py-2 text-sm text-zinc-500">No matches</p>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div><label className="text-xs uppercase tracking-wide text-zinc-400">Date</label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><label className="text-xs uppercase tracking-wide text-zinc-400">Time</label><Input type="time" step={900} value={time} onChange={(e) => setTime(e.target.value)} /></div>
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-400">Duration</label>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm">
              {[30, 60, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-400">Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm">
              <option value="INSPECTION">Inspection</option><option value="ESTIMATE">Estimate</option><option value="FOLLOWUP">Follow-up</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-400">Rep</label>
          <select value={repId} onChange={(e) => setRepId(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm">
            <option value="">Me</option>
            {reps.map((r) => <option key={r.repId} value={r.repId}>{r.name}</option>)}
          </select>
        </div>

        <div><label className="text-xs uppercase tracking-wide text-zinc-400">Notes</label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

        <Button className="w-full" onClick={save} disabled={busy || !leadId || !date || !time}>{busy ? "Saving…" : "Schedule"}</Button>
      </div>
    </div>
  );
}

// useSearchParams (range drill-down) must be inside a Suspense boundary.
export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-zinc-500">Loading…</div>}>
      <AppointmentsContent />
    </Suspense>
  );
}
