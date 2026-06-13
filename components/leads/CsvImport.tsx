"use client";

import { useState } from "react";
import { Upload } from "lucide-react";

// Uploads a CSV (columns: name, address, city, state, zip, phone, email, notes)
// to the bulk import endpoint, which geocodes each row server-side.
export function CsvImport({ onImported }: { onImported: () => void }) {
  const [busy, setBusy] = useState(false);

  async function handle(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/leads/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      alert(
        `Imported ${data.imported} leads. ` +
          `${data.geocodeFailed ? `${data.geocodeFailed} could not be geocoded. ` : ""}` +
          `${data.skipped ? `${data.skipped} skipped.` : ""}`,
      );
      onImported();
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-nsr-blue px-4 text-sm font-semibold text-black">
      <Upload className="h-4 w-4" />
      {busy ? "Importing…" : "Import CSV"}
      <input
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handle(e.target.files[0])}
      />
    </label>
  );
}
