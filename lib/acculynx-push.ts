import { prisma } from "@/lib/db";
import { acculynx } from "@/lib/acculynx";

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

  const job = await acculynx().createLead({
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

  // Cache the rep's resolved AccuLynx user id for future pushes.
  const assignedId = (job as { assignedAcculynxUserId?: string }).assignedAcculynxUserId;
  if (assignedId && lead.rep && !lead.rep.acculynxId) {
    await prisma.user.update({ where: { id: lead.rep.id }, data: { acculynxId: assignedId } });
  }

  // Flip the lead to the "Converted" disposition.
  const converted = await prisma.dispositionStatus.findFirst({
    where: { label: { contains: "Converted", mode: "insensitive" } },
  });
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      acculynxJobId: job.id,
      acculynxStatus: job.milestone || "Lead",
      dispositionStatusId: converted?.id ?? lead.dispositionStatusId,
      dispositionAt: new Date(),
    },
  });

  return {
    ok: true,
    jobId: job.id,
    repAssignment: (job as { repAssignment?: unknown }).repAssignment,
  };
}
