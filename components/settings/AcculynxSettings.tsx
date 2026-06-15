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
interface SyncRow { id: string; direction: string; event: string; status: string; errorMessage: string | null; createdAt: string; leadLabel: string }

export function AcculynxSettings() {
  const { data: settings, mutate } = useSWR<Settings>("/api/settings/integrations/acculynx");
  const { data: statuses = [] } = useSWR<DispositionStatusDTO[]>("/api/disposition-statuses");
  const { data: leadSources = [] } = useSWR<NamedId[]>("/api/acculynx/lead-sources");
  const { data: acculynxUsers = [] } = useSWR<NamedId[]>("/api/acculynx/users");
  const { data: milestones = [] } = useSWR<NamedId[]>("/api/acculynx/milestones");
  const { data: users = [], mutate: mutateUsers } = useSWR<UserRow[]>("/api/users");
  const { data: syncLog = [], mutate: mutateSync } = useSWR<SyncRow[]>("/api/settings/integrations/acculynx/sync-log?days=7");

  async function retrySync(id: string) {
    await fetch(`/api/settings/integrations/acculynx/sync-log/${id}/retry`, { method: "POST" });
    mutateSync();
  }

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

  function mapMilestone(milestoneId: string, dispositionId: string) {
    if (!settings) return;
    const next = { ...settings.milestoneMap };
    if (dispositionId) next[milestoneId] = dispositionId;
    else delete next[milestoneId];
    save({ milestoneMap: next });
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

      {/* Milestone -> disposition map */}
      <Card className="space-y-2">
        <CardTitle>Milestone → disposition</CardTitle>
        <p className="text-xs text-zinc-500">
          When AccuLynx fires a milestone change, update the lead to the mapped disposition.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-zinc-400">
              <tr><th className="p-2">AccuLynx milestone</th><th className="p-2">NSR disposition</th></tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr key={m.id} className="border-t border-zinc-800">
                  <td className="p-2">{m.name}</td>
                  <td className="p-2">
                    <select
                      value={settings?.milestoneMap[m.id] ?? ""}
                      onChange={(e) => mapMilestone(m.id, e.target.value)}
                      className="h-9 rounded-lg border border-zinc-700 bg-zinc-950 px-2 text-sm"
                    >
                      <option value="">No sync</option>
                      {statuses.map((s) => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {milestones.length === 0 && (
                <tr><td colSpan={2} className="p-2 text-xs text-zinc-500">No milestones loaded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
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

      {/* Sync log */}
      <Card className="space-y-2">
        <CardTitle>Sync log (last 7 days)</CardTitle>
        <div className="max-h-72 overflow-y-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-zinc-900 text-left text-xs uppercase text-zinc-400">
              <tr><th className="p-2">Time</th><th className="p-2">Dir</th><th className="p-2">Event</th><th className="p-2">Lead</th><th className="p-2">Status</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {syncLog.map((s) => (
                <tr key={s.id} className="border-t border-zinc-800">
                  <td className="p-2 text-xs text-zinc-400">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="p-2 text-xs">{s.direction === "to_acculynx" ? "→" : "←"}</td>
                  <td className="p-2">{s.event}</td>
                  <td className="p-2 text-zinc-400">{s.leadLabel}</td>
                  <td className="p-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs ${s.status === "success" ? "bg-green-900 text-green-300" : s.status === "failed" ? "bg-red-900 text-red-300" : "bg-yellow-900 text-yellow-300"}`}>{s.status}</span>
                    {s.errorMessage && <div className="text-[10px] text-red-400">{s.errorMessage.slice(0, 80)}</div>}
                  </td>
                  <td className="p-2">
                    {s.status === "failed" && <button onClick={() => retrySync(s.id)} className="text-xs text-nsr-blue hover:underline">Retry</button>}
                  </td>
                </tr>
              ))}
              {syncLog.length === 0 && <tr><td colSpan={6} className="p-3 text-xs text-zinc-500">No sync activity yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
