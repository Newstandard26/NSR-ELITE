import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { pushLeadToAccuLynx } from "@/lib/acculynx-push";

// POST /api/leads/[id]/acculynx — manually push the lead to AccuLynx.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const result = await pushLeadToAccuLynx(params.id);

    if (!result.ok) {
      return json({ error: result.error || "Push failed" }, 400);
    }
    if (result.alreadyLinked) {
      return json({ error: "Lead already linked to AccuLynx", jobId: result.jobId }, 409);
    }

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: { dispositionStatus: true },
    });
    return json({ lead, job: { id: result.jobId, repAssignment: result.repAssignment } }, 201);
  } catch (err) {
    return handleError(err);
  }
}
