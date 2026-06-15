"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";

interface Row {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "REP";
  isActive: boolean;
  lastLoginAt: string | null;
  logins: number;
  activeDays: number;
  appts: number;
  gpsPings: number;
  notes: number;
  leads: number;
  lastActiveAt: string | null;
  engaged: boolean;
}

interface Summary {
  totalUsers: number;
  activeUsers: number;
  engagedUsers: number;
  dormantUsers: number;
}

const RANGES = [
  { key: "7d", label: "7 Days" },
  { key: "30d", label: "30 Days" },
  { key: "90d", label: "90 Days" },
  { key: "all", label: "All Time" },
] as const;

type SortKey = "name" | "lastActiveAt" | "logins" | "activeDays" | "appts" | "gpsPings" | "notes" | "leads";

function fromNow(iso: string | null) {
  if (!iso) return "—";
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

// Visual flag for adoption, based on the most recent activity of ANY kind
// (login or in-app work) — not just logins, since persistent mobile sessions
// mean an active user may not have re-authenticated recently.
function statusFor(row: Row): { label: string; cls: string } {
  const ref = row.lastActiveAt ?? row.lastLoginAt;
  if (!ref) return { label: "No activity", cls: "bg-red-500/15 text-red-400" };
  const days = (Date.now() - new Date(ref).getTime()) / 86_400_000;
  if (days <= 7) return { label: "Active", cls: "bg-green-500/15 text-green-400" };
  if (days <= 30) return { label: "Slipping", cls: "bg-amber-500/15 text-amber-400" };
  return { label: "Inactive", cls: "bg-red-500/15 text-red-400" };
}

function StatCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs uppercase tracking-wide text-zinc-400">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-zinc-600">{hint}</div>}
    </div>
  );
}

export function UserAnalytics() {
  const [range, setRange] = useState<string>("30d");
  const [sort, setSort] = useState<SortKey>("lastActiveAt");
  const [asc, setAsc] = useState(false);

  const { data, isLoading } = useSWR<{ summary: Summary; rows: Row[] }>(
    `/api/settings/analytics?range=${range}`,
  );
  const summary = data?.summary;
  const rows = [...(data?.rows ?? [])].sort((a, b) => {
    let cmp: number;
    if (sort === "name") cmp = a.name.localeCompare(b.name);
    else if (sort === "lastActiveAt") {
      const av = a.lastActiveAt ? new Date(a.lastActiveAt).getTime() : 0;
      const bv = b.lastActiveAt ? new Date(b.lastActiveAt).getTime() : 0;
      cmp = av - bv;
    } else cmp = (a[sort] as number) - (b[sort] as number);
    return asc ? cmp : -cmp;
  });

  function sortBy(key: SortKey) {
    if (key === sort) setAsc((v) => !v);
    else {
      setSort(key);
      setAsc(key === "name");
    }
  }

  const arrow = (key: SortKey) => (sort === key ? (asc ? " ↑" : " ↓") : "");

  const numCols: { key: SortKey; label: string }[] = [
    { key: "logins", label: "App Opens" },
    { key: "activeDays", label: "Active Days" },
    { key: "leads", label: "Leads" },
    { key: "appts", label: "Appts" },
    { key: "gpsPings", label: "GPS Pings" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Team Usage Analytics</h2>
          <p className="text-xs text-zinc-500">Logins and in-app activity, so you can see who is actually using the app.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-zinc-800 p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`rounded-lg px-3 py-1 text-sm ${range === r.key ? "bg-nsr-blue text-black" : "text-zinc-300"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Users" value={summary?.totalUsers ?? "—"} />
        <StatCard label="Active Accounts" value={summary?.activeUsers ?? "—"} />
        <StatCard label="Used in Range" value={summary?.engagedUsers ?? "—"} hint="logged in or did work" />
        <StatCard label="Not Using" value={summary?.dormantUsers ?? "—"} hint="active accounts, no activity" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-400">
            <tr>
              <th className="cursor-pointer p-3" onClick={() => sortBy("name")}>Rep{arrow("name")}</th>
              <th className="p-3">Status</th>
              <th className="cursor-pointer p-3" onClick={() => sortBy("lastActiveAt")}>Last Active{arrow("lastActiveAt")}</th>
              {numCols.map((c) => (
                <th key={c.key} className="cursor-pointer p-3 text-right" onClick={() => sortBy(c.key)}>
                  {c.label}{arrow(c.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const st = statusFor(r);
              return (
                <tr key={r.id} className="border-t border-zinc-800">
                  <td className="p-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-zinc-500">{r.role}{!r.isActive && " · disabled"}</div>
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="p-3 text-zinc-300">{fromNow(r.lastActiveAt)}</td>
                  <td className="p-3 text-right">{r.logins}</td>
                  <td className="p-3 text-right">{r.activeDays}</td>
                  <td className="p-3 text-right">{r.leads}</td>
                  <td className="p-3 text-right">{r.appts}</td>
                  <td className="p-3 text-right">{r.gpsPings}</td>
                  <td className="p-3 text-right">{r.notes}</td>
                </tr>
              );
            })}
            {!isLoading && rows.length === 0 && (
              <tr><td colSpan={9} className="p-6 text-center text-zinc-500">No users found.</td></tr>
            )}
            {isLoading && (
              <tr><td colSpan={9} className="p-6 text-center text-zinc-500">Loading…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
