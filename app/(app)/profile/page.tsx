"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ProfilePage() {
  const { data: session } = useSession();
  const user = session?.user;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delPassword, setDelPassword] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setDelError(null);
    if (!window.confirm("Permanently delete your account? This cannot be undone.")) return;
    setDelBusy(true);
    const res = await fetch("/api/profile", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: delPassword }),
    });
    if (res.ok) {
      signOut({ callbackUrl: "/login" });
      return;
    }
    setDelBusy(false);
    const data = await res.json().catch(() => ({}));
    setDelError(data.error || "Failed to delete account.");
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (next !== confirm) {
      setMsg({ ok: false, text: "New passwords don't match." });
      return;
    }
    setBusy(true);
    const res = await fetch("/api/auth/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });
    setBusy(false);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ ok: true, text: "Password updated." });
      setCurrent(""); setNext(""); setConfirm("");
    } else {
      setMsg({ ok: false, text: data.error || "Failed to update password." });
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <h1 className="text-xl font-semibold">Profile</h1>
      <Card>
        <CardLabel>Name</CardLabel>
        <CardTitle>{user?.name}</CardTitle>
        <CardLabel className="mt-3">Email</CardLabel>
        <p className="text-sm">{user?.email}</p>
        <CardLabel className="mt-3">Role</CardLabel>
        <p className="text-sm">{user?.role}</p>
      </Card>

      <Card>
        <form onSubmit={changePassword} className="space-y-3">
          <CardLabel>Change password</CardLabel>
          <Input type="password" placeholder="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
          <Input type="password" placeholder="New password" value={next} onChange={(e) => setNext(e.target.value)} required autoComplete="new-password" />
          <Input type="password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
          {msg && <p className={`text-sm ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Update password"}</Button>
        </form>
      </Card>

      <Button variant="secondary" className="w-full" onClick={() => signOut({ callbackUrl: "/login" })}>
        Sign out
      </Button>

      <Card>
        <CardLabel className="text-red-400">Delete account</CardLabel>
        {!delOpen ? (
          <>
            <p className="mt-1 text-sm text-zinc-400">
              Permanently delete your account and personal data. This can&apos;t be undone.
            </p>
            <Button variant="secondary" className="mt-3 w-full border border-red-500/40 text-red-400 hover:bg-red-950" onClick={() => setDelOpen(true)}>
              Delete my account
            </Button>
          </>
        ) : (
          <form onSubmit={deleteAccount} className="mt-2 space-y-3">
            <p className="text-sm text-zinc-400">Enter your password to confirm.</p>
            <Input type="password" placeholder="Password" value={delPassword} onChange={(e) => setDelPassword(e.target.value)} required autoComplete="current-password" />
            {delError && <p className="text-sm text-red-400">{delError}</p>}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" className="flex-1" onClick={() => { setDelOpen(false); setDelError(null); setDelPassword(""); }}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700" disabled={delBusy}>
                {delBusy ? "Deleting…" : "Delete forever"}
              </Button>
            </div>
          </form>
        )}
      </Card>

      <p className="text-center text-xs text-zinc-600">
        <a href="/privacy" className="hover:text-zinc-400">Privacy Policy</a>
        {" · "}
        <a href="/terms" className="hover:text-zinc-400">Terms of Use</a>
      </p>
    </div>
  );
}
