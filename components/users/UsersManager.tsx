"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "REP";
  isActive: boolean;
  acculynxId: string | null;
}

// Editable user roster. Fixing a rep's email here lets the AccuLynx push
// auto-match them to their AccuLynx user (sales owner) on the next push.
export function UsersManager() {
  const { data: users = [], mutate } = useSWR<UserRow[]>("/api/users");
  const [drafts, setDrafts] = useState<Record<string, Partial<UserRow>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  function edit(id: string, patch: Partial<UserRow>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  async function save(user: UserRow) {
    const draft = drafts[user.id];
    if (!draft) return;
    setSavingId(user.id);
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    setSavingId(null);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Failed to save user");
      return;
    }
    setDrafts((d) => {
      const next = { ...d };
      delete next[user.id];
      return next;
    });
    mutate();
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Users</h2>
      <p className="text-xs text-zinc-500">
        Make each rep&apos;s email match their AccuLynx login so leads they own are
        auto-assigned to them in AccuLynx.
      </p>

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-400">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Active</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const draft = drafts[u.id] ?? {};
              const dirty = Object.keys(draft).length > 0;
              return (
                <tr key={u.id} className="border-t border-zinc-800">
                  <td className="p-3">{u.name}</td>
                  <td className="p-2">
                    <Input
                      value={draft.email ?? u.email}
                      onChange={(e) => edit(u.id, { email: e.target.value })}
                      className="h-9 min-w-[240px]"
                      type="email"
                    />
                  </td>
                  <td className="p-2">
                    <select
                      value={draft.role ?? u.role}
                      onChange={(e) => edit(u.id, { role: e.target.value as UserRow["role"] })}
                      className="h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
                    >
                      <option value="REP">Rep</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={draft.isActive ?? u.isActive}
                      onChange={(e) => edit(u.id, { isActive: e.target.checked })}
                      className="h-4 w-4"
                    />
                  </td>
                  <td className="p-2 text-right">
                    <Button
                      size="sm"
                      onClick={() => save(u)}
                      disabled={!dirty || savingId === u.id}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {savingId === u.id ? "Saving…" : "Save"}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
