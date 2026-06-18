"use client";

import { useState } from "react";
import useSWR from "swr";
import { GripVertical, Pencil, Archive, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PinEditor, type PinDraft } from "./PinEditor";
import type { DispositionStatusDTO } from "@/lib/types";

// Settings → Disposition Pins. Table with create / edit / reorder / deactivate.
// All mutations revalidate via SWR so changes reflect across sessions on save.
export function PinTable() {
  // Include archived so they show with the "Archived" badge.
  const { data: pins = [], mutate } = useSWR<DispositionStatusDTO[]>(
    "/api/disposition-statuses?all=true",
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  // Blank abbreviation/stage should clear to null, not store an empty string.
  function normalize(draft: Partial<PinDraft>) {
    return {
      ...draft,
      ...(draft.abbreviation !== undefined ? { abbreviation: draft.abbreviation || null } : {}),
      ...(draft.pipelineStage !== undefined ? { pipelineStage: draft.pipelineStage || null } : {}),
    };
  }

  async function createPin(draft: PinDraft) {
    const res = await fetch("/api/disposition-statuses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalize(draft)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Failed to create pin");
      return;
    }
    setCreating(false);
    mutate();
  }

  async function updatePin(id: string, draft: Partial<PinDraft>) {
    const res = await fetch(`/api/disposition-statuses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalize(draft)),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Failed to save pin");
      return;
    }
    setEditing(null);
    mutate();
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this pin? Historical leads keep this status.")) return;
    await fetch(`/api/disposition-statuses/${id}`, { method: "DELETE" });
    mutate();
  }

  async function reactivate(id: string) {
    await fetch(`/api/disposition-statuses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: true }),
    });
    mutate();
  }

  // --- Drag & drop reorder (active pins only) ---
  async function persistOrder(ordered: DispositionStatusDTO[]) {
    await fetch("/api/disposition-statuses/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: ordered.map((p) => p.id) }),
    });
    mutate();
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const ordered = [...pins].sort((a, b) => a.sortOrder - b.sortOrder);
    const from = ordered.findIndex((p) => p.id === dragId);
    const to = ordered.findIndex((p) => p.id === targetId);
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    setDragId(null);
    // Optimistic, then persist.
    mutate(ordered.map((p, i) => ({ ...p, sortOrder: i + 1 })), false);
    persistOrder(ordered);
  }

  const sorted = [...pins].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Disposition Pins</h2>
        <Button onClick={() => setCreating((v) => !v)}>
          <Plus className="h-4 w-4" /> New Pin
        </Button>
      </div>

      {creating && (
        <PinEditor isCreate onSave={createPin} onCancel={() => setCreating(false)} />
      )}

      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        {sorted.map((pin) =>
          editing === pin.id ? (
            <div key={pin.id} className="border-b border-zinc-800 p-2">
              <PinEditor
                initial={pin}
                onSave={(d) => updatePin(pin.id, d)}
                onCancel={() => setEditing(null)}
              />
            </div>
          ) : (
            <div
              key={pin.id}
              draggable={pin.isActive}
              onDragStart={() => setDragId(pin.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(pin.id)}
              className="flex items-center gap-3 border-b border-zinc-800 bg-zinc-900 p-3 last:border-b-0"
            >
              {pin.isActive ? (
                <GripVertical className="h-4 w-4 cursor-grab text-zinc-600" />
              ) : (
                <span className="w-4" />
              )}
              <span
                className="h-5 w-5 rounded-full border border-zinc-700"
                style={{ backgroundColor: pin.color }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{pin.label}</span>
                  {pin.isDefault && (
                    <span className="flex items-center gap-0.5 text-xs text-nsr-blue">
                      <Star className="h-3 w-3 fill-nsr-blue" /> Default
                    </span>
                  )}
                  {!pin.isActive && (
                    <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] uppercase text-zinc-300">
                      Archived
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-zinc-400">{pin._count?.leads ?? 0} leads</span>
              <button onClick={() => setEditing(pin.id)} className="p-2 hover:text-nsr-blue" aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </button>
              {pin.isActive ? (
                <button onClick={() => deactivate(pin.id)} className="p-2 hover:text-red-400" aria-label="Deactivate">
                  <Archive className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={() => reactivate(pin.id)}
                  className="px-2 text-xs text-nsr-blue hover:underline"
                >
                  Restore
                </button>
              )}
            </div>
          ),
        )}
      </div>
      <p className="text-xs text-zinc-500">
        Drag the handle to reorder — order controls the rep disposition dropdown. Deactivating
        preserves historical leads.
      </p>
    </div>
  );
}
