"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-black p-4 text-sm text-zinc-500">Loading…</div>}>
      <SetPasswordForm />
    </Suspense>
  );
}

function SetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [state, setState] = useState<"checking" | "valid" | "invalid" | "done">("checking");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setState("invalid");
      return;
    }
    fetch(`/api/auth/set-password?token=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setEmail(d.email);
        setName(d.name);
        setState("valid");
      })
      .catch(() => setState("invalid"));
  }, [token]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    const res = await fetch("/api/auth/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Could not set your password. The link may have expired.");
      return;
    }
    setState("done");
    setTimeout(() => router.push("/login"), 1800);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-full.svg" alt="NSR Elite" className="mx-auto w-56" />
          <p className="mt-3 text-sm text-zinc-400">New Standard Restoration</p>
        </div>

        {state === "checking" && <p className="text-center text-sm text-zinc-500">Checking your invite…</p>}

        {state === "invalid" && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-red-400">This invite link is invalid or has expired.</p>
            <p className="text-xs text-zinc-500">Ask an admin to send you a new invite.</p>
            <Button className="w-full" onClick={() => router.push("/login")}>Go to sign in</Button>
          </div>
        )}

        {state === "done" && (
          <div className="space-y-2 text-center">
            <p className="text-sm text-green-400">Password set! Redirecting you to sign in…</p>
          </div>
        )}

        {state === "valid" && (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-center text-sm text-zinc-400">
              Welcome{name ? `, ${name.split(" ")[0]}` : ""}! Set a password for <strong className="text-zinc-200">{email}</strong>.
            </p>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-zinc-400">New password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wide text-zinc-400">Confirm password</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "Saving…" : "Set password & continue"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
