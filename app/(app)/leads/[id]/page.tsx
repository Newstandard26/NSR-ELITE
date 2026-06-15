"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, MapPin, Phone, Mail, ExternalLink } from "lucide-react";
import { Card, CardLabel } from "@/components/ui/card";
import { DispositionBadge } from "@/components/ui/badge";
import type { LeadDTO } from "@/lib/types";

interface ActivityDTO {
  id: string;
  type: string;
  description: string;
  actor: string | null;
  createdAt: string;
}
interface LeadDetail extends LeadDTO {
  notes: { id: string; content: string; author: string; createdAt: string }[];
  activities: ActivityDTO[];
}

const TYPE_LABEL: Record<string, string> = {
  lead_created: "Created",
  status_changed: "Status",
  note_added: "Note",
  rep_changed: "Assignment",
  acculynx_push: "AccuLynx",
  acculynx_milestone: "AccuLynx",
  lead_imported: "Imported",
};

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: lead } = useSWR<LeadDetail>(`/api/leads/${id}`);

  if (!lead) return <div className="p-6 text-zinc-500">Loading…</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <Link href="/leads" className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Back to leads
      </Link>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Lead info */}
        <Card className="space-y-3">
          <div>
            <h1 className="text-lg font-semibold">{lead.ownerName || "Unknown homeowner"}</h1>
            <p className="flex items-center gap-1 text-sm text-zinc-400">
              <MapPin className="h-3.5 w-3.5" /> {lead.address}, {lead.city} {lead.state} {lead.zip}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lead.dispositionStatus && (
              <DispositionBadge
                label={lead.dispositionStatus.label}
                color={lead.dispositionStatus.color}
                icon={lead.dispositionStatus.icon}
              />
            )}
            {lead.rep && <span className="text-sm text-zinc-400">Rep: {lead.rep.name}</span>}
          </div>
          <div className="flex flex-col gap-1 text-sm">
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-nsr-blue">
                <Phone className="h-4 w-4" /> {lead.phone}
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-nsr-blue">
                <Mail className="h-4 w-4" /> {lead.email}
              </a>
            )}
          </div>

          {lead.acculynxJobId ? (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 text-sm">
              <CardLabel>AccuLynx</CardLabel>
              <a
                href={`https://my.acculynx.com/jobs/${lead.acculynxJobId}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 flex items-center gap-1 text-purple-400 hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> Open Job {lead.acculynxJobId}
              </a>
              {lead.acculynxStatus && <p className="text-zinc-400">Milestone: {lead.acculynxStatus}</p>}
            </div>
          ) : (
            <p className="text-xs text-zinc-500">Not synced to AccuLynx yet.</p>
          )}
        </Card>

        {/* Activity feed */}
        <Card className="space-y-3">
          <CardLabel>Activity</CardLabel>
          <ul className="space-y-3">
            {lead.activities.length === 0 && (
              <li className="text-sm text-zinc-500">No activity yet.</li>
            )}
            {lead.activities.map((a) => (
              <li key={a.id} className="border-l-2 border-zinc-700 pl-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase text-zinc-300">
                    {TYPE_LABEL[a.type] ?? a.type}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="mt-0.5 text-sm">{a.description}</p>
                {a.actor && <p className="text-xs text-zinc-500">by {a.actor}</p>}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
