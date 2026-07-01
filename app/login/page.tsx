"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (!res) {
        setError("Couldn't reach the server. Check your connection and try again.");
        setBusy(false);
        return;
      }
      if (res.error) {
        setError("Invalid email or password.");
        setBusy(false);
        return;
      }
      // Success: full-page navigation so the new session cookie is reliably
      // applied (more robust than client routing inside the mobile app WebView).
      window.location.assign("/dashboard");
    } catch {
      setError("Something went wrong signing in. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-full.svg" alt="NSR Elite Door Knocker" className="mx-auto w-60" />
          <p className="mt-3 text-sm text-zinc-400">New Standard Restoration</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-zinc-400">Email</label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wide text-zinc-400">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-xs text-zinc-500">
          <a href="/privacy" className="hover:text-zinc-300">Privacy Policy</a>
          {" · "}
          <a href="/terms" className="hover:text-zinc-300">Terms of Use</a>
        </p>
      </form>
    </div>
  );
}
