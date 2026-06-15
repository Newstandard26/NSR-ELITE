import { prisma } from "@/lib/db";
import { acculynx } from "@/lib/acculynx";
import { logActivity } from "@/lib/activity";
import { getIntegrationSettings } from "@/lib/settings";
import { logSync } from "@/lib/sync-log";

export interface PushResult {
  ok: boolean;
  alreadyLinked?: boolean;
  jobId?: string;
  repAssignment?: unknown;
  error?: string;
}

// Push a canvassing lead to AccuLynx: create the contact + job, assign the
// rep as sales owner, store the ids, and flip the lead to "Converted".
// Reused by the manual endpoint and the auto-push trigger.
export async function pushLeadToAccuLynx(leadId: string): Promise<PushResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { rep: { select: { id: true, email: true, acculynxId: true } } },
  });
  if (!lead) return { ok: false, error: "Lead not found" };
  if (lead.acculynxJobId) return { ok: true, alreadyLinked: true, jobId: lead.acculynxJobId };

  const notes = await prisma.note.findMany({
    where: { leadId: lead.id },
    orderBy: { createdAt: "asc" },
  });
  const notesText = notes.map((n) => `${n.author}: ${n.content}`).join("\n") || undefined;

  const settings = await getIntegrationSettings();
  let job;
  try {
    job = await acculynx().createLead({
      leadSourceId: settings.acculynxLeadSourceId,
      name: lead.ownerName || lead.address,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zip: lead.zip,
      phone: lead.phone,
      email: lead.email,
      notes: notesText,
      leadId: lead.id,
      repAcculynxId: lead.rep?.acculynxId,
      repEmail: lead.rep?.email,
    });
  } catch (e) {
    await logSync("to_acculynx", "Push Failed", "failed", { leadId: lead.id, error: (e as Error).message });
    throw e;
  }

  // Cache the rep's resolved AccuLynx user id for future pushes.
  const assignedId = (job as { assignedAcculynxUserId?: string }).assignedAcculynxUserId;
  if (assignedId && lead.rep && !lead.rep.acculynxId) {
    await prisma.user.update({ where: { id: lead.rep.id }, data: { acculynxId: assignedId } });
  }

  // Flip the lead to the "Converted" disposition.
  const converted = await prisma.dispositionStatus.findFirst({
    where: { label: { contains: "Converted", mode: "insensitive" } },
  });
  const contactId = (job as { contactId?: string }).contactId;
  const jobUrl = (job as { _link?: string })._link;
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      acculynxJobId: job.id,
      acculynxContactId: contactId,
      acculynxJobUrl: jobUrl,
      acculynxStatus: job.milestone || "Lead",
      acculynxPushedAt: new Date(),
      dispositionStatusId: converted?.id ?? lead.dispositionStatusId,
      dispositionAt: new Date(),
    },
  });

  await logActivity(lead.id, "acculynx_push", `Pushed to AccuLynx (job ${job.id})`, "System", {
    acculynxJobId: job.id,
  });
  await logSync("to_acculynx", "Lead Pushed", "success", { leadId: lead.id });

  return {
    ok: true,
    jobId: job.id,
    repAssignment: (job as { repAssignment?: unknown }).repAssignment,
  };
}
