"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmojiPicker } from "./EmojiPicker";
import type { DispositionStatusDTO } from "@/lib/types";

export interface PinDraft {
  label: string;
  color: string;
  icon: string;
  isDefault: boolean;
}

// Create/edit form for a disposition pin. `isCreate` exposes the default toggle.
export function PinEditor({
  initial,
  isCreate,
  onSave,
  onCancel,
}: {
  initial?: DispositionStatusDTO;
  isCreate?: boolean;
  onSave: (draft: PinDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<PinDraft>({
    label: initial?.label ?? "",
    color: initial?.color ?? "#51C5F4",
    icon: initial?.icon ?? "🔵",
    isDefault: initial?.isDefault ?? false,
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!draft.label.trim()) return;
    setBusy(true);
    await onSave(draft);
    setBusy(false);
  }

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center gap-3">
        <EmojiPicker value={draft.icon} onChange={(icon) => setDraft((d) => ({ ...d, icon }))} />
        <div className="flex-1 space-y-1">
          <label className="text-xs uppercase tracking-wide text-zinc-400">Label</label>
          <Input
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="e.g. Interested / Appointment Set"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-zinc-400">Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draft.color}
              onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
              className="h-11 w-14 cursor-pointer rounded-lg border border-zinc-700 bg-transparent"
            />
            <Input
              value={draft.color}
              onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))}
              className="w-28 font-mono"
            />
          </div>
        </div>
      </div>

      {isCreate && (
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={draft.isDefault}
            onChange={(e) => setDraft((d) => ({ ...d, isDefault: e.target.checked }))}
          />
          Set as default status for new leads
        </label>
      )}

      <div className="flex gap-2">
        <Button onClick={save} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
