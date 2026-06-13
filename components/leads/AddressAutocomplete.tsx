"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import type { PlaceDetails, PlacePrediction } from "@/lib/places";

// Debounced address search backed by our /api/places proxy. On select it pulls
// place details and hands the parsed address + coordinates to the parent.
export function AddressAutocomplete({
  onSelect,
  initialValue = "",
}: {
  onSelect: (details: PlaceDetails) => void;
  initialValue?: string;
}) {
  const [query, setQuery] = useState(initialValue);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  // One Google session token per search-through-selection (billing optimization).
  const sessionToken = useRef<string>(crypto.randomUUID());
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (query.trim().length < 3) {
      setPredictions([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/places/autocomplete?q=${encodeURIComponent(query)}&token=${sessionToken.current}`,
        );
        const data = await res.json();
        setPredictions(data.predictions || []);
        setOpen(true);
      } catch {
        setPredictions([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  async function choose(p: PlacePrediction) {
    skipNext.current = true;
    setQuery(p.description);
    setOpen(false);
    setPredictions([]);
    const res = await fetch(
      `/api/places/details?placeId=${encodeURIComponent(p.placeId)}&token=${sessionToken.current}`,
    );
    // Refresh the session token after a selection completes a billing session.
    sessionToken.current = crypto.randomUUID();
    if (res.ok) {
      const details = (await res.json()) as PlaceDetails;
      onSelect(details);
    }
  }

  return (
    <div className="relative">
      <label className="text-xs uppercase tracking-wide text-zinc-400">Address</label>
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => predictions.length && setOpen(true)}
        placeholder="Start typing an address…"
        autoComplete="off"
      />
      {open && (predictions.length > 0 || loading) && (
        <ul className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
          {loading && <li className="px-3 py-2 text-sm text-zinc-500">Searching…</li>}
          {predictions.map((p) => (
            <li key={p.placeId}>
              <button
                type="button"
                onClick={() => choose(p)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-800"
              >
                {p.description}
              </button>
            </li>
          ))}
        </ul>
      )}
      {predictions.length === 0 && query.length >= 3 && !loading && open && (
        <p className="mt-1 text-xs text-zinc-500">
          No matches — you can still type the address manually below.
        </p>
      )}
    </div>
  );
}
