"use client";

import { useState } from "react";
import useSWR from "swr";
import { X, MapPin, Phone, Mail, ExternalLink, Camera, Plus, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, Input } from "@/components/ui/input";
import { DispositionBadge } from "@/components/ui/badge";
import { DispositionSelector } from "./DispositionSelector";
import { uploadToCloudinary } from "@/lib/cloudinary";
import type { DispositionStatusDTO, LeadDTO, NoteDTO } from "@/lib/types";

interface LeadDetail extends LeadDTO {
  notes: NoteDTO[];
  photos: { id: string; url: string }[];
}

export function LeadCardDrawer({
  leadId,
  statuses,
  onClose,
  onChanged,
}: {
  leadId: string;
  statuses: DispositionStatusDTO[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: lead, mutate } = useSWR<LeadDetail>(`/api/leads/${leadId}`);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [apptOpen, setApptOpen] = useState(false);
  const [apptAt, setApptAt] = useState("");
  const [apptType, setApptType] = useState("INSPECTION");

  async function updateDisposition(dispositionStatusId: string) {
    setBusy("disposition");
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dispositionStatusId }),
    });
    await mutate();
    onChanged();
    setBusy(null);
  }

  async function addNote() {
    if (!note.trim()) return;
    setBusy("note");
    await fetch(`/api/leads/${leadId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: note, pushToAcculynx: !!lead?.acculynxJobId }),
    });
    setNote("");
    await mutate();
    setBusy(null);
  }

  async function createAcculynxLead() {
    setBusy("acculynx");
    const res = await fetch(`/api/leads/${leadId}/acculynx`, { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Failed to create AccuLynx lead");
    }
    await mutate();
    onChanged();
    setBusy(null);
  }

  async function addPhoto(file: File) {
    setBusy("photo");
    try {
      const url = await uploadToCloudinary(file);
      await fetch(`/api/leads/${leadId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      await mutate();
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(null);
  }

  async function createAppointment() {
    if (!apptAt) return;
    setBusy("appt");
    await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadId,
        scheduledAt: new Date(apptAt).toISOString(),
        type: apptType,
        pushToAcculynx: !!lead?.acculynxJobId,
      }),
    });
    setApptOpen(false);
    setApptAt("");
    setBusy(null);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[420px]">
      <div className="animate-slide-up max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-zinc-800 bg-zinc-900 p-4 sm:h-full sm:max-h-full sm:rounded-none sm:border-l sm:border-t-0">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{lead?.ownerName || "Unknown homeowner"}</h2>
            <p className="flex items-center gap-1 text-sm text-zinc-400">
              <MapPin className="h-3.5 w-3.5" />
              {lead?.address}, {lead?.city} {lead?.state} {lead?.zip}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-zinc-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!lead ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-300">
              {lead.dispositionStatus && (
                <DispositionBadge
                  label={lead.dispositionStatus.label}
                  color={lead.dispositionStatus.color}
                  icon={lead.dispositionStatus.icon}
                />
              )}
              {lead.rep && <span className="text-zinc-400">Rep: {lead.rep.name}</span>}
            </div>

            <div className="flex flex-col gap-1 text-sm">
              {lead.phone && (
                <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-nsr-blue">
                  <Phone className="h-4 w-4" /> {lead.phone}
                </a>
              )}
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-nsr-blue">
                  <Mail className="h-4 w-4" /> {lead.email}
                </a>
              )}
              {lead.acculynxJobId && (
                <span className="flex items-center gap-2 text-purple-400">
                  <ExternalLink className="h-4 w-4" /> AccuLynx Job {lead.acculynxJobId}
                  {lead.acculynxStatus ? ` — ${lead.acculynxStatus}` : ""}
                </span>
              )}
            </div>

            <DispositionSelector
              statuses={statuses}
              value={lead.dispositionStatusId}
              onChange={updateDisposition}
              disabled={busy === "disposition"}
            />

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setApptOpen((v) => !v)}>
                <CalendarPlus className="h-4 w-4" /> Appointment
              </Button>
              <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-600 px-4 text-sm font-semibold text-white hover:bg-zinc-800">
                <Camera className="h-4 w-4" /> {busy === "photo" ? "Uploading…" : "Photo"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && addPhoto(e.target.files[0])}
                />
              </label>
              {!lead.acculynxJobId && (
                <Button
                  className="col-span-2"
                  onClick={createAcculynxLead}
                  disabled={busy === "acculynx"}
                >
                  {busy === "acculynx" ? "Creating…" : "Create AccuLynx Lead"}
                </Button>
              )}
            </div>

            {apptOpen && (
              <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
                <Input type="datetime-local" value={apptAt} onChange={(e) => setApptAt(e.target.value)} />
                <select
                  value={apptType}
                  onChange={(e) => setApptType(e.target.value)}
                  className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm"
                >
                  <option value="INSPECTION">Inspection</option>
                  <option value="ESTIMATE">Estimate</option>
                  <option value="FOLLOWUP">Follow-up</option>
                </select>
                <Button className="w-full" onClick={createAppointment} disabled={busy === "appt"}>
                  Set Appointment
                </Button>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Notes</h4>
              </div>
              <div className="flex gap-2">
                <Textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note…"
                />
                <Button size="icon" onClick={addNote} disabled={busy === "note"} aria-label="Add note">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <ul className="space-y-2">
                {lead.notes.map((n) => (
                  <li key={n.id} className="rounded-lg bg-zinc-950 p-2 text-sm">
                    <p>{n.content}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {n.author} · {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            {lead.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {lead.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={p.url} alt="Lead" className="aspect-square rounded-lg object-cover" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
