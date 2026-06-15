"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { Check, X, RefreshCw, Copy } from "lucide-react";
import { Card, CardLabel, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { DispositionStatusDTO } from "@/lib/types";

interface Settings {
  acculynxLeadSourceId: string | null;
  triggerStatusIds: string[];
  milestoneMap: Record<string, string>;
  hasApiKey: boolean;
}
interface NamedId { id: string; name: string; email?: string }
interface UserRow { id: string; name: string; email: string; acculynxId: string | null }

export function AcculynxSettings() {
  const { data: settings, mutate } = useSWR<Settings>("/api/settings/integrations/acculynx");
  const { data: statuses = [] } = useSWR<DispositionStatusDTO[]>("/api/disposition-statuses");
  const { data: leadSources = [] } = useSWR<NamedId[]>("/api/acculynx/lead-sources");
  const { data: acculynxUsers = [] } = useSWR<NamedId[]>("/api/acculynx/users");
  const { data: users = [], mutate: mutateUsers } = useSWR<UserRow[]>("/api/users");

  const [ping, setPing] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  async function save(patch: Partial<Settings>) {
    await fetch("/api/settings/integrations/acculynx", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    mutate();
  }

  async function testConnection() {
    setPing("testing");
    const res = await fetch("/api/acculynx/ping");
    const data = await res.json().catch(() => ({}));
    setPing(data.connected ? "ok" : "fail");
  }

  async function mapRep(userId: string, acculynxId: string) {
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acculynxId: acculynxId || null }),
    });
    mutateUsers();
  }

  function toggleTrigger(id: string) {
    if (!settings) return;
    const set = new Set(settings.triggerStatusIds);
    set.has(id) ? set.delete(id) : set.add(id);
    save({ triggerStatusIds: [...set] });
  }

  const webhookUrl = origin ? `${origin}/api/webhooks/acculynx?secret=YOUR_SECRET` : "";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">AccuLynx Integration</h2>

      {/* Connection */}
      <Card className="space-y-2">
        <CardLabel>Connection</CardLabel>
        <div className="flex items-center gap-3">
          <span className={settings?.hasApiKey ? "text-green-400" : "text-red-400"}>
            API key {settings?.hasApiKey ? "configured" : "missing"}
          </span>
          <Button size="sm" variant="secondary" onClick={testConnection} disabled={ping === "testing"}>
            <RefreshCw className="h-4 w-4" /> {ping === "testing" ? "Testing…" : "Test Connection"}
          </Button>
          {ping === "ok" && <span className="flex items-center gap-1 text-green-400"><Check className="h-4 w-4" /> Connected</span>}
          {ping === "fail" && <span className="flex items-center gap-1 text-red-400"><X className="h-4 w-4" /> Failed</span>}
        </div>
        <p className="text-xs text-zinc-500">The API key is stored as an environment variable, never in the database.</p>
      </Card>

      {/* Lead source */}
      <Card className="space-y-2">
        <CardLabel>Lead source for canvassing leads</CardLabel>
        <select
          value={settings?.acculynxLeadSourceId ?? ""}
          onChange={(e) => save({ acculynxLeadSourceId: e.target.value || null })}
          className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm"
        >
          <option value="">Auto (prefer &quot;Canvassing&quot;)</option>
          {leadSources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </Card>

      {/* Trigger statuses */}
      <Card className="space-y-2">
        <CardLabel>Auto-push to AccuLynx when a lead reaches…</CardLabel>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => {
            const on = settings?.triggerStatusIds.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => toggleTrigger(s.id)}
                className={`rounded-full border px-3 py-1 text-xs ${on ? "border-nsr-blue bg-nsr-blue/10 text-nsr-blue" : "border-zinc-700 text-zinc-300"}`}
              >
                {s.icon} {s.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500">If none selected, pushes when a status maps to the &quot;Customer&quot; pipeline stage.</p>
      </Card>

      {/* Webhook URL */}
      <Card className="space-y-2">
        <CardLabel>Webhook receiver URL</CardLabel>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg bg-zinc-950 p-2 text-xs">{webhookUrl}</code>
          <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(webhookUrl)}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-zinc-500">
          Register this in AccuLynx&apos;s webhook subscriptions. Replace YOUR_SECRET with the value of
          the ACCULYNX_WEBHOOK_SECRET environment variable.
        </p>
      </Card>

      {/* Rep mapping */}
      <Card className="space-y-2">
        <CardTitle>Rep mapping</CardTitle>
        <p className="text-xs text-zinc-500">
          Auto-matched by email on first push; override here if a rep&apos;s AccuLynx email differs.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-zinc-400">
              <tr><th className="p-2">Rep</th><th className="p-2">AccuLynx user</th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-zinc-800">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">
                    <select
                      value={u.acculynxId ?? ""}
                      onChange={(e) => mapRep(u.id, e.target.value)}
                      className="h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
                    >
                      <option value="">— auto (by email) —</option>
                      {acculynxUsers.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}{a.email ? ` (${a.email})` : ""}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
