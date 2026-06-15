"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardLabel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadToCloudinary } from "@/lib/cloudinary";

interface Branding {
  brandColor: string | null;
  logoUrl: string | null;
}

export function BrandingSettings() {
  const { data, mutate } = useSWR<Branding>("/api/settings/branding");
  const [busy, setBusy] = useState<string | null>(null);

  async function save(patch: Partial<Branding>) {
    setBusy("save");
    await fetch("/api/settings/branding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await mutate();
    setBusy(null);
    // Apply immediately for color.
    if (patch.brandColor) document.documentElement.style.setProperty("--nsr-blue", patch.brandColor);
  }

  async function uploadLogo(file: File) {
    setBusy("logo");
    try {
      const url = await uploadToCloudinary(file);
      await save({ logoUrl: url });
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(null);
  }

  const color = data?.brandColor ?? "#51C5F4";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Branding</h2>

      <Card className="space-y-3">
        <CardLabel>Brand color</CardLabel>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => save({ brandColor: e.target.value })}
            className="h-11 w-16 cursor-pointer rounded-lg border border-zinc-700 bg-transparent"
          />
          <Input value={color} onChange={(e) => save({ brandColor: e.target.value })} className="w-32 font-mono" />
        </div>
        <p className="text-xs text-zinc-500">Applies to buttons, active nav, and accents across the app.</p>
      </Card>

      <Card className="space-y-3">
        <CardLabel>Logo</CardLabel>
        {data?.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.logoUrl} alt="Logo" className="max-h-16 w-auto rounded bg-zinc-950 p-2 object-contain" />
        )}
        <div className="flex items-center gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-zinc-600 px-3 text-sm hover:bg-zinc-800">
            {busy === "logo" ? "Uploading…" : "Upload logo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])}
            />
          </label>
          {data?.logoUrl && (
            <Button size="sm" variant="secondary" onClick={() => save({ logoUrl: null })} disabled={busy === "save"}>
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-zinc-500">Shown in the sidebar. Requires Cloudinary to be configured.</p>
      </Card>
    </div>
  );
}
