"use client";

import { Home, RefreshCw, Building2, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PropertyRecordDTO } from "@/lib/types";

const money = (n: number | null | undefined) =>
  n == null ? "—" : `$${n.toLocaleString("en-US")}`;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className="text-right font-medium text-zinc-100">{value}</span>
    </div>
  );
}

export function PropertyDataPanel({
  record,
  enrichedAt,
  onPull,
  busy,
}: {
  record?: PropertyRecordDTO | null;
  enrichedAt?: string | null;
  onPull: () => void;
  busy: boolean;
}) {
  if (!record) {
    return (
      <div className="rounded-xl border border-zinc-800 p-3">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <Home className="h-4 w-4 text-nsr-blue" /> Property data
        </div>
        <p className="mb-2 text-xs text-zinc-500">
          Pull owner, value, equity and contact info for this address.
        </p>
        <Button className="w-full" onClick={onPull} disabled={busy}>
          {busy ? "Pulling…" : "Pull property data"}
        </Button>
      </div>
    );
  }

  const phones = record.phones ?? [];
  const emails = record.emails ?? [];

  return (
    <div className="space-y-2 rounded-xl border border-zinc-800 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Home className="h-4 w-4 text-nsr-blue" /> Property data
          {record.source === "mock" && (
            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-400">
              Sample data
            </span>
          )}
        </div>
        <button
          onClick={onPull}
          disabled={busy}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
          aria-label="Refresh property data"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="space-y-1">
        <Row
          label="Owner"
          value={
            <span className="inline-flex items-center gap-1">
              {record.ownerName || "—"}
              {record.ownerOccupied != null && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                    record.ownerOccupied
                      ? "bg-green-500/15 text-green-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {record.ownerOccupied ? "Owner-occ." : "Absentee"}
                </span>
              )}
            </span>
          }
        />
        <Row
          label="Est. value (AVM)"
          value={
            <>
              {money(record.avmValue)}
              {record.avmLow != null && record.avmHigh != null && (
                <span className="ml-1 text-xs font-normal text-zinc-500">
                  ({money(record.avmLow)}–{money(record.avmHigh)})
                </span>
              )}
            </>
          }
        />
        <Row label="Est. equity" value={money(record.estimatedEquity)} />
        {record.estimatedIncomeBand && <Row label="Est. income" value={record.estimatedIncomeBand} />}
        <Row
          label="Last sale"
          value={
            record.lastSalePrice
              ? `${money(record.lastSalePrice)}${record.lastSaleDate ? ` · ${record.lastSaleDate.slice(0, 10)}` : ""}`
              : "—"
          }
        />
        <Row
          label="Built / size"
          value={
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5 text-zinc-500" />
              {record.yearBuilt ?? "—"}
              {record.sqft ? ` · ${record.sqft.toLocaleString()} sqft` : ""}
              {record.beds != null ? ` · ${record.beds}bd` : ""}
              {record.baths != null ? `/${record.baths}ba` : ""}
            </span>
          }
        />
      </div>

      {(phones.length > 0 || emails.length > 0) && (
        <div className="space-y-1 border-t border-zinc-800 pt-2">
          {phones.map((p, i) => (
            <a
              key={i}
              href={`tel:${p.number}`}
              className="flex items-center gap-2 text-sm text-nsr-blue"
            >
              <Phone className="h-3.5 w-3.5" /> {p.number}
              {p.type && <span className="text-xs text-zinc-500">{p.type}</span>}
              {p.dnc && (
                <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] text-red-400">
                  DNC
                </span>
              )}
            </a>
          ))}
          {emails.map((e, i) => (
            <a key={i} href={`mailto:${e}`} className="flex items-center gap-2 text-sm text-nsr-blue">
              <Mail className="h-3.5 w-3.5" /> {e}
            </a>
          ))}
        </div>
      )}

      <p className="text-[10px] leading-tight text-zinc-600">
        Source: {record.source}
        {enrichedAt ? ` · pulled ${new Date(enrichedAt).toLocaleDateString()}` : ""}. Income/equity are
        modeled estimates, not credit reports. Honor DNC before calling/texting.
      </p>
    </div>
  );
}
