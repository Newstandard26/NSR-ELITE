"use client";

import { useState } from "react";
import useSWR from "swr";
import { Check, Plus, KeyRound, X, Copy } from "lucide-react";
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

function genPassword() {
  // Readable temporary password, e.g. NSR-4821.
  return `NSR-${Math.floor(1000 + Math.random() * 9000)}`;
}

export function UsersManager() {
  const { data: users = [], mutate } = useSWR<UserRow[]>("/api/users");
  const [drafts, setDrafts] = useState<Record<string, Partial<UserRow>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // Shows a freshly-set temp password to copy/share.
  const [tempCred, setTempCred] = useState<{ email: string; password: string } | null>(null);

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

  async function resetPassword(user: UserRow) {
    const password = genPassword();
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) setTempCred({ email: user.email, password });
    else alert("Failed to reset password");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Users</h2>
        <Button size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>
      <p className="text-xs text-zinc-500">
        Make each rep&apos;s email match their AccuLynx login so leads they own are auto-assigned in
        AccuLynx. Set yourself to <strong>Admin</strong> here if needed.
      </p>

      {adding && (
        <AddUserModal
          onClose={() => setAdding(false)}
          onCreated={(cred) => {
            setTempCred(cred);
            mutate();
          }}
        />
      )}

      {tempCred && (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-nsr-blue/40 bg-zinc-900 p-3 text-sm">
          <div>
            <p className="font-semibold">Share these login details with the user:</p>
            <p className="text-zinc-300">
              {tempCred.email} · temp password: <span className="font-mono">{tempCred.password}</span>
            </p>
            <p className="text-xs text-zinc-500">They sign in, then change it under Profile.</p>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(`${tempCred.email} / ${tempCred.password}`)}>
              <Copy className="h-4 w-4" />
            </Button>
            <button onClick={() => setTempCred(null)} className="p-1 text-zinc-400 hover:text-white"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-left text-xs uppercase text-zinc-400">
            <tr>
              <th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Role</th>
              <th className="p-3">Active</th><th className="p-3"></th>
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
                    <Input value={draft.email ?? u.email} onChange={(e) => edit(u.id, { email: e.target.value })} className="h-9 min-w-[220px]" type="email" />
                  </td>
                  <td className="p-2">
                    <select value={draft.role ?? u.role} onChange={(e) => edit(u.id, { role: e.target.value as UserRow["role"] })} className="h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm">
                      <option value="REP">Rep</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <input type="checkbox" checked={draft.isActive ?? u.isActive} onChange={(e) => edit(u.id, { isActive: e.target.checked })} className="h-4 w-4" />
                  </td>
                  <td className="p-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => resetPassword(u)} title="Reset password" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white">
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <Button size="sm" onClick={() => save(u)} disabled={!dirty || savingId === u.id}>
                        <Check className="h-3.5 w-3.5" />{savingId === u.id ? "Saving…" : "Save"}
                      </Button>
                    </div>
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

function AddUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (cred: { email: string; password: string }) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("REP");
  const [password, setPassword] = useState(genPassword());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, role, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setError(e.error === "Already exists" ? "A user with that email already exists." : e.error || "Failed to create user.");
      return;
    }
    onCreated({ email: email.toLowerCase(), password });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
      <div className="animate-slide-up w-full max-w-md space-y-3 rounded-t-2xl border border-zinc-800 bg-zinc-900 p-4 sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Add User</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-full p-2 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </div>
        <div><label className="text-xs uppercase tracking-wide text-zinc-400">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><label className="text-xs uppercase tracking-wide text-zinc-400">Email</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-400">Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm">
            <option value="REP">Rep</option><option value="MANAGER">Manager</option><option value="ADMIN">Admin</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-400">Temporary password</label>
          <div className="flex gap-2">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} className="font-mono" />
            <Button variant="secondary" size="sm" onClick={() => setPassword(genPassword())}>New</Button>
          </div>
          <p className="mt-1 text-xs text-zinc-500">You&apos;ll share this with the user; they change it after signing in.</p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button className="w-full" onClick={submit} disabled={busy}>{busy ? "Creating…" : "Create User"}</Button>
      </div>
    </div>
  );
}
