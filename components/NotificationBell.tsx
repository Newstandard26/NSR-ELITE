"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Bell } from "lucide-react";

interface Notif { id: string; type: string; message: string; leadId: string | null; read: boolean; createdAt: string }

export function NotificationBell() {
  const { data, mutate } = useSWR<{ items: Notif[]; unread: number }>(
    "/api/notifications",
    { refreshInterval: 30000 },
  );
  const [open, setOpen] = useState(false);
  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "PATCH" });
    mutate();
  }
  async function markOne(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    mutate();
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-300 hover:bg-zinc-900" aria-label="Notifications">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-72 rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-800 p-2">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && <button onClick={markAll} className="text-xs text-nsr-blue hover:underline">Mark all read</button>}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && <li className="p-3 text-sm text-zinc-500">No notifications.</li>}
            {items.map((n) => (
              <li key={n.id} className={`border-b border-zinc-800 last:border-0 ${n.read ? "" : "bg-zinc-800/40"}`}>
                <Link
                  href={n.leadId ? `/leads/${n.leadId}` : "#"}
                  onClick={() => { markOne(n.id); setOpen(false); }}
                  className="block p-2 hover:bg-zinc-800"
                >
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-zinc-500">{new Date(n.createdAt).toLocaleString()}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
