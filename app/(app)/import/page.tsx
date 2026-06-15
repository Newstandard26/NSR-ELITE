"use client";

import { useState } from "react";
import Papa from "papaparse";
import useSWR from "swr";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel } from "@/components/ui/card";
import type { DispositionStatusDTO, RepStatsDTO } from "@/lib/types";

const APP_FIELDS = [
  { key: "", label: "— skip —" },
  { key: "ownerName", label: "Homeowner Name" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "Zip" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "notes", label: "Notes" },
];

// Auto-guess a mapping from a CSV header.
function guess(header: string): string {
  const h = header.toLowerCase();
  if (/first|last|owner|name|homeowner/.test(h)) return "ownerName";
  if (/address|street/.test(h)) return "address";
  if (/city/.test(h)) return "city";
  if (/state/.test(h)) return "state";
  if (/zip|postal/.test(h)) return "zip";
  if (/phone|mobile|cell/.test(h)) return "phone";
  if (/email/.test(h)) return "email";
  if (/note/.test(h)) return "notes";
  return "";
}

export default function ImportPage() {
  const [step, setStep] = useState(1);
  const [filename, setFilename] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [map, setMap] = useState<Record<string, string>>({});
  const [dupHandling, setDupHandling] = useState<"skip" | "update">("skip");
  const [defaultDispositionId, setDefaultDispositionId] = useState("");
  const [defaultRepId, setDefaultRepId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ imported: number; updated: number; skipped: number; geocodeFailed: number; errors: string[] } | null>(null);

  const { data: statuses = [] } = useSWR<DispositionStatusDTO[]>("/api/disposition-statuses");
  const { data: reps = [] } = useSWR<RepStatsDTO[]>("/api/reps");
  const { data: history = [], mutate: mutateHistory } = useSWR<{ id: string; filename: string; total: number; success: number; errors: number; importedBy: string | null; createdAt: string }[]>("/api/imports");

  function onFile(file: File) {
    setFilename(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true, skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const cols = res.meta.fields ?? [];
        setHeaders(cols);
        setRows(res.data);
        const m: Record<string, string> = {};
        cols.forEach((c) => (m[c] = guess(c)));
        setMap(m);
        setStep(2);
      },
    });
  }

  async function startImport() {
    setBusy(true);
    const leads = rows.map((r) => {
      const lead: Record<string, string> = {};
      for (const [csvCol, appField] of Object.entries(map)) {
        if (appField && r[csvCol]) lead[appField] = r[csvCol];
      }
      return lead;
    });
    const res = await fetch("/api/leads/import", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, leads, duplicateHandling: dupHandling, defaultDispositionId: defaultDispositionId || undefined, defaultRepId: defaultRepId || undefined }),
    });
    const data = await res.json().catch(() => ({}));
    setResult(data);
    setBusy(false);
    setStep(4);
    mutateHistory();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Import Leads</h1>
      <div className="flex gap-2 text-xs text-zinc-400">
        {["Upload", "Map fields", "Options", "Done"].map((s, i) => (
          <span key={s} className={`rounded px-2 py-1 ${step === i + 1 ? "bg-nsr-blue text-black" : "bg-zinc-800"}`}>{i + 1}. {s}</span>
        ))}
      </div>

      {step === 1 && (
        <Card className="space-y-3">
          <CardLabel>Upload CSV</CardLabel>
          <label className="flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 text-sm text-zinc-400 hover:bg-zinc-950">
            <Upload className="h-6 w-6" /> Click to choose a .csv file
            <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          <a href="/lead-import-template.csv" className="text-xs text-nsr-blue hover:underline" download>Download template</a>
        </Card>
      )}

      {step === 2 && (
        <Card className="space-y-3">
          <CardLabel>Map columns ({rows.length} rows)</CardLabel>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-zinc-400"><th className="p-2">CSV column</th><th className="p-2">Maps to</th></tr></thead>
            <tbody>
              {headers.map((h) => (
                <tr key={h} className="border-t border-zinc-800">
                  <td className="p-2">{h}</td>
                  <td className="p-2">
                    <select value={map[h] ?? ""} onChange={(e) => setMap((m) => ({ ...m, [h]: e.target.value }))} className="h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm">
                      {APP_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => setStep(1)}>Back</Button><Button onClick={() => setStep(3)}>Next</Button></div>
        </Card>
      )}

      {step === 3 && (
        <Card className="space-y-3">
          <CardLabel>Options</CardLabel>
          <div><label className="text-xs text-zinc-400">Duplicate handling (matched by address+zip)</label>
            <select value={dupHandling} onChange={(e) => setDupHandling(e.target.value as "skip" | "update")} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm">
              <option value="skip">Skip duplicates</option><option value="update">Update existing</option>
            </select>
          </div>
          <div><label className="text-xs text-zinc-400">Default disposition</label>
            <select value={defaultDispositionId} onChange={(e) => setDefaultDispositionId(e.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm">
              <option value="">Use system default</option>
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
            </select>
          </div>
          <div><label className="text-xs text-zinc-400">Assign all to rep</label>
            <select value={defaultRepId} onChange={(e) => setDefaultRepId(e.target.value)} className="h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm">
              <option value="">Unassigned</option>
              {reps.map((r) => <option key={r.repId} value={r.repId}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2"><Button variant="secondary" onClick={() => setStep(2)}>Back</Button><Button onClick={startImport} disabled={busy}>{busy ? "Importing…" : "Start Import"}</Button></div>
        </Card>
      )}

      {step === 4 && result && (
        <Card className="space-y-2">
          <CardLabel>Import complete</CardLabel>
          <p className="text-sm">✅ {result.imported} imported · 🔄 {result.updated} updated · ⏭ {result.skipped} skipped · ⚠️ {result.errors.length} errors</p>
          {result.geocodeFailed > 0 && <p className="text-xs text-zinc-500">{result.geocodeFailed} could not be geocoded.</p>}
          <Button onClick={() => { setStep(1); setResult(null); setRows([]); setHeaders([]); }}>Import another</Button>
        </Card>
      )}

      <Card className="space-y-2">
        <CardLabel>Import history</CardLabel>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-zinc-400"><th className="p-2">Date</th><th className="p-2">File</th><th className="p-2">By</th><th className="p-2 text-right">Total</th><th className="p-2 text-right">Success</th><th className="p-2 text-right">Errors</th></tr></thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className="border-t border-zinc-800">
                <td className="p-2 text-zinc-400">{new Date(h.createdAt).toLocaleString()}</td>
                <td className="p-2">{h.filename}</td><td className="p-2 text-zinc-400">{h.importedBy}</td>
                <td className="p-2 text-right">{h.total}</td><td className="p-2 text-right text-green-400">{h.success}</td><td className="p-2 text-right text-red-400">{h.errors}</td>
              </tr>
            ))}
            {history.length === 0 && <tr><td colSpan={6} className="p-2 text-xs text-zinc-500">No imports yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
