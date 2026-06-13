"use client";

import { useState } from "react";

// Lightweight searchable emoji picker (no external dependency). Covers the
// pins/markers most relevant to canvassing; falls back to free typing.
const EMOJIS: { char: string; keywords: string }[] = [
  { char: "🔵", keywords: "blue circle not visited" },
  { char: "🟡", keywords: "yellow not home" },
  { char: "🟢", keywords: "green interested appointment" },
  { char: "🔴", keywords: "red not interested decline" },
  { char: "⚪", keywords: "white do not knock" },
  { char: "🟠", keywords: "orange callback" },
  { char: "🟣", keywords: "purple converted job" },
  { char: "⚫", keywords: "black" },
  { char: "🏠", keywords: "house home" },
  { char: "🚪", keywords: "door knock" },
  { char: "📞", keywords: "phone call callback" },
  { char: "📅", keywords: "calendar appointment" },
  { char: "⭐", keywords: "star hot lead" },
  { char: "🔥", keywords: "fire hot" },
  { char: "💰", keywords: "money sold converted" },
  { char: "✅", keywords: "check done complete" },
  { char: "❌", keywords: "x no decline" },
  { char: "⚠️", keywords: "warning caution" },
  { char: "🛠️", keywords: "tools roof repair" },
  { char: "🌧️", keywords: "rain storm damage" },
];

export function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = q
    ? EMOJIS.filter((e) => e.keywords.includes(q.toLowerCase()) || e.char === q)
    : EMOJIS;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-2xl"
        aria-label="Pick icon"
      >
        {value}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-60 rounded-xl border border-zinc-700 bg-zinc-900 p-2 shadow-xl">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="mb-2 h-9 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
          />
          <div className="grid max-h-40 grid-cols-6 gap-1 overflow-y-auto">
            {filtered.map((e) => (
              <button
                key={e.char}
                type="button"
                onClick={() => {
                  onChange(e.char);
                  setOpen(false);
                }}
                className="flex h-9 items-center justify-center rounded-lg text-xl hover:bg-zinc-800"
              >
                {e.char}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
