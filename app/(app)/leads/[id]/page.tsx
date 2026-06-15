"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ArrowLeft, MapPin, ExternalLink, Trash2, Plus } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { DispositionBadge } from "@/components/ui/badge";
import type { DispositionStatusDTO, LeadDTO, RepStatsDTO } from "@/lib/types";

interface ActivityDTO { id: string; type: string; description: string; actor: string | null; createdAt: string }
interface LeadDetail extends LeadDTO {
  roofAge: number | null;
  insuranceCompany: string | null;
  notes: { id: string; content: string; author: string; createdAt: string }[];
  activities: ActivityDTO[];
  createdAt: string;
  updatedAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  lead_created: "Created", status_changed: "Status", note_added: "Note",
  rep_changed: "Assignment", acculynx_push: "AccuLynx", acculynx_milestone: "AccuLynx",
  lead_imported: "Imported",
};

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: lead, mutate } = useSWR<LeadDetail>(`/api/leads/${id}`);
  const { data: statuses = [] } = useSWR<DispositionStatusDTO[]>("/api/disposition-statuses");
  const { data: reps = [] } = useSWR<RepStatsDTO[]>("/api/reps");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (!lead) return <div className="p-6 text-zinc-500">Loading…</div>;

  const val = (k: keyof LeadDetail) => (draft[k] !== undefined ? draft[k] : (lead[k] as unknown));
  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));

  async function patch(body: Record<string, unknown>) {
    await fetch(`/api/leads/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    await mutate();
  }

  async function saveEdits() {
    setBusy("save");
    await patch({
      ownerName: draft.ownerName, phone: draft.phone, email: draft.email,
      roofAge: draft.roofAge === "" || draft.roofAge === undefined ? undefined : Number(draft.roofAge),
      insuranceCompany: draft.insuranceCompany,
    });
    setDraft({});
    setEditing(false);
    setBusy(null);
  }

  async function addNote() {
    if (!note.trim()) return;
    setBusy("note");
    await fetch(`/api/leads/${id}/notes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: note, pushToAcculynx: !!lead?.acculynxJobId }),
    });
    setNote("");
    await mutate();
    setBusy(null);
  }

  async function pushAcculynx() {
    setBusy("acculynx");
    const res = await fetch(`/api/leads/${id}/acculynx`, { method: "POST" });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      alert(e.error || "AccuLynx push failed");
    }
    await mutate();
    setBusy(null);
  }

  async function del() {
    if (!confirm("Delete this lead? This cannot be undone.")) return;
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    router.push("/leads");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Link href="/leads" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to leads
        </Link>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={saveEdits} disabled={busy === "save"}>Save</Button>
              <Button size="sm" variant="secondary" onClick={() => { setDraft({}); setEditing(false); }}>Cancel</Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
          )}
          <Button size="sm" variant="danger" onClick={del}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Lead info */}
        <Card className="space-y-3">
          {editing ? (
            <div className="space-y-2">
              <div><CardLabel>Homeowner</CardLabel><Input value={String(val("ownerName") ?? "")} onChange={(e) => set("ownerName", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><CardLabel>Phone</CardLabel><Input value={String(val("phone") ?? "")} onChange={(e) => set("phone", e.target.value)} /></div>
                <div><CardLabel>Email</CardLabel><Input value={String(val("email") ?? "")} onChange={(e) => set("email", e.target.value)} /></div>
                <div><CardLabel>Roof age</CardLabel><Input type="number" value={String(val("roofAge") ?? "")} onChange={(e) => set("roofAge", e.target.value)} /></div>
                <div><CardLabel>Insurance</CardLabel><Input value={String(val("insuranceCompany") ?? "")} onChange={(e) => set("insuranceCompany", e.target.value)} /></div>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-lg font-semibold">{lead.ownerName || "Unknown homeowner"}</h1>
                <p className="flex items-center gap-1 text-sm text-zinc-400">
                  <MapPin className="h-3.5 w-3.5" /> {lead.address}, {lead.city} {lead.state} {lead.zip}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><CardLabel>Phone</CardLabel><p>{lead.phone || "—"}</p></div>
                <div><CardLabel>Email</CardLabel><p>{lead.email || "—"}</p></div>
                <div><CardLabel>Roof age</CardLabel><p>{lead.roofAge ?? "—"}</p></div>
                <div><CardLabel>Insurance</CardLabel><p>{lead.insuranceCompany || "—"}</p></div>
                <div><CardLabel>Territory</CardLabel><p>{lead.territory?.name || "—"}</p></div>
                <div><CardLabel>Created</CardLabel><p>{new Date(lead.createdAt).toLocaleDateString()}</p></div>
              </div>
            </>
          )}

          {/* Disposition + Rep inline selects */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <CardLabel>Disposition</CardLabel>
              <select value={lead.dispositionStatusId ?? ""} onChange={(e) => patch({ dispositionStatusId: e.target.value })}
                className="mt-1 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm">
                <option value="">—</option>
                {statuses.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
              </select>
            </div>
            <div>
              <CardLabel>Assigned rep</CardLabel>
              <select value={lead.repId ?? ""} onChange={(e) => patch({ repId: e.target.value || null })}
                className="mt-1 h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm">
                <option value="">Unassigned</option>
                {reps.map((r) => <option key={r.repId} value={r.repId}>{r.name}</option>)}
              </select>
            </div>
          </div>

          {/* AccuLynx */}
          {lead.acculynxJobId ? (
            <a href={`https://my.acculynx.com/jobs/${lead.acculynxJobId}`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-sm text-purple-400 hover:underline">
              <ExternalLink className="h-4 w-4" /> Open AccuLynx Job {lead.acculynxStatus ? `(${lead.acculynxStatus})` : ""}
            </a>
          ) : (
            <Button size="sm" onClick={pushAcculynx} disabled={busy === "acculynx"}>
              {busy === "acculynx" ? "Pushing…" : "Push to AccuLynx"}
            </Button>
          )}
        </Card>

        {/* Activity + notes */}
        <Card className="space-y-3">
          <CardLabel>Activity</CardLabel>
          <div className="flex gap-2">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note…" />
            <Button size="icon" onClick={addNote} disabled={busy === "note"} aria-label="Add note"><Plus className="h-4 w-4" /></Button>
          </div>
          <ul className="space-y-3">
            {lead.activities.length === 0 && <li className="text-sm text-zinc-500">No activity yet.</li>}
            {lead.activities.map((a) => (
              <li key={a.id} className="border-l-2 border-zinc-700 pl-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-300">{TYPE_LABEL[a.type] ?? a.type}</span>
                  <span className="text-xs text-zinc-500">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-0.5 text-sm">{a.description}</p>
                {a.actor && <p className="text-xs text-zinc-500">by {a.actor}</p>}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
