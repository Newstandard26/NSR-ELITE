"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DispositionBadge } from "@/components/ui/badge";
import { CsvImport } from "./CsvImport";
import { LeadForm } from "./LeadForm";
import { LeadCardDrawer } from "@/components/map/LeadCardDrawer";
import type { DispositionStatusDTO, LeadDTO } from "@/lib/types";

// Secondary list view of leads with search/sort/filter.
export function LeadTable() {
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const { data: leads = [], mutate } = useSWR<LeadDTO[]>(`/api/leads${query}`);
  const { data: statuses = [] } = useSWR<DispositionStatusDTO[]>("/api/disposition-statuses");

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Leads</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
          <CsvImport onImported={() => mutate()} />
        </div>
      </div>

      {adding && <LeadForm onClose={() => setAdding(false)} onCreated={() => mutate()} />}

      <Input
        placeholder="Search name, address, city, zip…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-400">
            <tr>
              <th className="p-3">Homeowner</th>
              <th className="p-3">Address</th>
              <th className="p-3">Disposition</th>
              <th className="p-3">Rep</th>
              <th className="p-3">AccuLynx</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr
                key={l.id}
                onClick={() => setSelectedLead(l.id)}
                className="cursor-pointer border-t border-zinc-800 transition-colors hover:bg-zinc-900"
              >
                <td className="p-3">{l.ownerName || "—"}</td>
                <td className="p-3 text-zinc-400">
                  {l.address}, {l.city} {l.state}
                </td>
                <td className="p-3">
                  {l.dispositionStatus && (
                    <DispositionBadge
                      label={l.dispositionStatus.label}
                      color={l.dispositionStatus.color}
                      icon={l.dispositionStatus.icon}
                      archived={!l.dispositionStatus.isActive}
                    />
                  )}
                </td>
                <td className="p-3 text-zinc-400">{l.rep?.name || "—"}</td>
                <td className="p-3 text-zinc-400">
                  {l.acculynxJobId ? l.acculynxStatus || "Linked" : "—"}
                </td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-zinc-500">
                  No leads yet. Import a CSV or add leads from the map.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedLead && (
        <LeadCardDrawer
          leadId={selectedLead}
          statuses={statuses}
          onClose={() => setSelectedLead(null)}
          onChanged={() => mutate()}
        />
      )}
    </div>
  );
}
