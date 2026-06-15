"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Plus, Download, Filter, ChevronUp, ChevronDown, Trash2, X, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DispositionBadge } from "@/components/ui/badge";
import { CsvImport } from "./CsvImport";
import { LeadForm } from "./LeadForm";
import type { DispositionStatusDTO, LeadDTO, RepStatsDTO } from "@/lib/types";

interface Paged {
  items: LeadDTO[];
  total: number;
  page: number;
  limit: number;
}

const ALL_COLUMNS = [
  { key: "owner", label: "Homeowner" },
  { key: "address", label: "Address" },
  { key: "disposition", label: "Disposition" },
  { key: "rep", label: "Rep" },
  { key: "acculynx", label: "AccuLynx" },
  { key: "notes", label: "Notes" },
] as const;
type ColKey = (typeof ALL_COLUMNS)[number]["key"];

export function LeadTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [sort, setSort] = useState("updatedAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(false);
  const [showCols, setShowCols] = useState(false);
  const [filters, setFilters] = useState<{ status?: string; rep?: string; dateFrom?: string; dateTo?: string }>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cols, setCols] = useState<Set<ColKey>>(new Set(ALL_COLUMNS.map((c) => c.key)));

  // Persist column visibility.
  useEffect(() => {
    const saved = localStorage.getItem("nsr.leadCols");
    if (saved) setCols(new Set(JSON.parse(saved)));
  }, []);
  useEffect(() => {
    localStorage.setItem("nsr.leadCols", JSON.stringify([...cols]));
  }, [cols]);

  const query = useMemo(() => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit), sort, order });
    if (search) qs.set("search", search);
    if (filters.status) qs.set("status", filters.status);
    if (filters.rep) qs.set("rep", filters.rep);
    if (filters.dateFrom) qs.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) qs.set("dateTo", filters.dateTo);
    return qs.toString();
  }, [page, limit, sort, order, search, filters]);

  const { data, mutate } = useSWR<Paged>(`/api/leads?${query}`);
  const { data: statuses = [] } = useSWR<DispositionStatusDTO[]>("/api/disposition-statuses");
  const { data: reps = [] } = useSWR<RepStatsDTO[]>("/api/reps");

  const leads = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  function toggleSort(col: string) {
    if (sort === col) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(col);
      setOrder("asc");
    }
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  const allSelected = leads.length > 0 && leads.every((l) => selected.has(l.id));

  async function bulkDelete() {
    if (!confirm(`Delete ${selected.size} lead(s)? This cannot be undone.`)) return;
    await fetch("/api/leads/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected] }),
    });
    setSelected(new Set());
    mutate();
  }

  async function bulkAssign(value: string) {
    const repId = value === "__none" ? null : value;
    await fetch("/api/leads/bulk-assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selected], repId }),
    });
    setSelected(new Set());
    mutate();
  }

  const exportUrl = `/api/leads/export?${new URLSearchParams({
    ...(search ? { search } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.rep ? { rep: filters.rep } : {}),
  }).toString()}`;

  const show = (k: ColKey) => cols.has(k);
  const SortHead = ({ col, label }: { col: string; label: string }) => (
    <th className="cursor-pointer select-none p-3" onClick={() => toggleSort(col)}>
      <span className="inline-flex items-center gap-1">
        {label}
        {sort === col && (order === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </span>
    </th>
  );

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Leads</h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowFilters((v) => !v)}>
            <Filter className="h-4 w-4" /> Filters
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowCols((v) => !v)}>
            <Settings2 className="h-4 w-4" /> Columns
          </Button>
          <a href={exportUrl} className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-600 px-3 text-xs font-semibold hover:bg-zinc-800">
            <Download className="h-4 w-4" /> Export
          </a>
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
          <CsvImport onImported={() => mutate()} />
        </div>
      </div>

      {adding && <LeadForm onClose={() => setAdding(false)} onCreated={() => mutate()} />}

      <Input
        placeholder="Search name, address, city, zip…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      {showFilters && (
        <div className="grid gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 sm:grid-cols-4">
          <select
            value={filters.status ?? ""}
            onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value || undefined })); setPage(1); }}
            className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
          >
            <option value="">All statuses</option>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
          </select>
          <select
            value={filters.rep ?? ""}
            onChange={(e) => { setFilters((f) => ({ ...f, rep: e.target.value || undefined })); setPage(1); }}
            className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
          >
            <option value="">All reps</option>
            {reps.map((r) => <option key={r.repId} value={r.repId}>{r.name}</option>)}
          </select>
          <input type="date" value={filters.dateFrom ?? ""} onChange={(e) => { setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined })); setPage(1); }} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm" />
          <input type="date" value={filters.dateTo ?? ""} onChange={(e) => { setFilters((f) => ({ ...f, dateTo: e.target.value || undefined })); setPage(1); }} className="h-10 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm" />
        </div>
      )}

      {showCols && (
        <div className="flex flex-wrap gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-3 text-sm">
          {ALL_COLUMNS.map((c) => (
            <label key={c.key} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={cols.has(c.key)}
                onChange={(e) =>
                  setCols((s) => {
                    const next = new Set(s);
                    e.target.checked ? next.add(c.key) : next.delete(c.key);
                    return next;
                  })
                }
              />
              {c.label}
            </label>
          ))}
        </div>
      )}

      {/* Bulk action toolbar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-nsr-blue/40 bg-zinc-900 p-3 text-sm">
          <span className="font-semibold">{selected.size} selected</span>
          <select
            onChange={(e) => e.target.value && bulkAssign(e.target.value)}
            defaultValue=""
            className="h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
          >
            <option value="" disabled>Assign to rep…</option>
            <option value="__none">Unassign</option>
            {reps.map((r) => <option key={r.repId} value={r.repId}>{r.name}</option>)}
          </select>
          <Button size="sm" variant="danger" onClick={bulkDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
          <button onClick={() => setSelected(new Set())} className="ml-auto p-1 text-zinc-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-400">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) =>
                    setSelected(e.target.checked ? new Set(leads.map((l) => l.id)) : new Set())
                  }
                />
              </th>
              {show("owner") && <SortHead col="ownerName" label="Homeowner" />}
              {show("address") && <SortHead col="city" label="Address" />}
              {show("disposition") && <th className="p-3">Disposition</th>}
              {show("rep") && <th className="p-3">Rep</th>}
              {show("acculynx") && <th className="p-3">AccuLynx</th>}
              {show("notes") && <th className="p-3">Notes</th>}
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
              <tr
                key={l.id}
                className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900"
                onClick={() => router.push(`/leads/${l.id}`)}
              >
                <td className="p-3" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} />
                </td>
                {show("owner") && <td className="p-3">{l.ownerName || "—"}</td>}
                {show("address") && (
                  <td className="p-3 text-zinc-400">
                    {l.address}, {l.city} {l.state}
                  </td>
                )}
                {show("disposition") && (
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
                )}
                {show("rep") && <td className="p-3 text-zinc-400">{l.rep?.name || "—"}</td>}
                {show("acculynx") && (
                  <td className="p-3 text-zinc-400">{l.acculynxJobId ? l.acculynxStatus || "Linked" : "—"}</td>
                )}
                {show("notes") && <td className="p-3 text-zinc-400">{l._count?.notes ?? 0}</td>}
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={ALL_COLUMNS.length + 1} className="p-6 text-center text-zinc-500">
                  No leads match. Adjust filters, import a CSV, or add a lead.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
        <div className="flex items-center gap-2">
          <span>Rows:</span>
          <select
            value={limit}
            onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
            className="h-8 rounded-lg border border-zinc-700 bg-zinc-950 px-2"
          >
            {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          <span>{total} total</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span>Page {page} / {totalPages}</span>
          <Button size="sm" variant="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
