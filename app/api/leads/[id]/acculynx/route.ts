import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { acculynx } from "@/lib/acculynx";

// POST /api/leads/[id]/acculynx
// Pushes the lead to AccuLynx, stores the returned job id, and auto-updates
// the disposition to "Converted / Job in AccuLynx".
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: { rep: { select: { id: true, email: true, acculynxId: true } } },
    });
    if (!lead) return json({ error: "Lead not found" }, 404);
    if (lead.acculynxJobId) {
      return json({ error: "Lead already linked to AccuLynx", jobId: lead.acculynxJobId }, 409);
    }

    // Combine all notes into the AccuLynx job note.
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
      await prisma.user.update({
        where: { id: lead.rep.id },
        data: { acculynxId: assignedId },
      });
    }

    // Find the "Converted" disposition to flip the lead automatically.
    const converted = await prisma.dispositionStatus.findFirst({
      where: { label: { contains: "Converted", mode: "insensitive" } },
    });

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        acculynxJobId: job.id,
        acculynxStatus: job.milestone || "Lead",
        dispositionStatusId: converted?.id ?? lead.dispositionStatusId,
        dispositionAt: new Date(),
      },
      include: { dispositionStatus: true },
    });

    return json({ lead: updated, job }, 201);
  } catch (err) {
    return handleError(err);
  }
}
