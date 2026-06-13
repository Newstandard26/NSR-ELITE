"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "./AddressAutocomplete";
import type { PlaceDetails } from "@/lib/places";

interface LeadFormState {
  address: string;
  city: string;
  state: string;
  zip: string;
  lat?: number;
  lng?: number;
  ownerName: string;
  phone: string;
  email: string;
  roofAge: string;
  insuranceCompany: string;
}

const EMPTY: LeadFormState = {
  address: "",
  city: "",
  state: "",
  zip: "",
  ownerName: "",
  phone: "",
  email: "",
  roofAge: "",
  insuranceCompany: "",
};

// Manual lead entry. Address comes from Google Places autocomplete, which
// autofills city/state/zip/lat/lng; the rest are typed.
export function LeadForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<LeadFormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<LeadFormState>) => setForm((f) => ({ ...f, ...patch }));

  function applyPlace(d: PlaceDetails) {
    set({ address: d.address, city: d.city, state: d.state, zip: d.zip, lat: d.lat, lng: d.lng });
  }

  async function submit() {
    if (!form.address || !form.city || !form.state || !form.zip) {
      setError("Address, city, state, and zip are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
        lat: form.lat,
        lng: form.lng,
        ownerName: form.ownerName || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        roofAge: form.roofAge ? parseInt(form.roofAge, 10) : undefined,
        insuranceCompany: form.insuranceCompany || undefined,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Failed to create lead");
      return;
    }
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="animate-slide-up max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-900 p-4 sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Lead</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          <AddressAutocomplete onSelect={applyPlace} />

          {/* Editable parsed fields (also act as manual fallback). */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-zinc-400">Street</label>
              <Input value={form.address} onChange={(e) => set({ address: e.target.value })} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-zinc-400">City</label>
              <Input value={form.city} onChange={(e) => set({ city: e.target.value })} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-zinc-400">State</label>
              <Input value={form.state} onChange={(e) => set({ state: e.target.value })} maxLength={2} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-zinc-400">Zip</label>
              <Input value={form.zip} onChange={(e) => set({ zip: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-zinc-400">Homeowner name</label>
            <Input value={form.ownerName} onChange={(e) => set({ ownerName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs uppercase tracking-wide text-zinc-400">Phone</label>
              <Input value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-zinc-400">Email</label>
              <Input value={form.email} onChange={(e) => set({ email: e.target.value })} type="email" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-zinc-400">Roof age (yrs)</label>
              <Input
                value={form.roofAge}
                onChange={(e) => set({ roofAge: e.target.value })}
                type="number"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wide text-zinc-400">Insurance</label>
              <Input
                value={form.insuranceCompany}
                onChange={(e) => set({ insuranceCompany: e.target.value })}
              />
            </div>
          </div>

          {form.lat != null && form.lat !== 0 && (
            <p className="text-xs text-zinc-500">
              📍 Located at {form.lat.toFixed(5)}, {form.lng?.toFixed(5)}
            </p>
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button className="w-full" onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Create Lead"}
          </Button>
        </div>
      </div>
    </div>
  );
}
