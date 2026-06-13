import { prisma } from "@/lib/db";
import { handleError, json } from "@/lib/api";

// POST /api/webhooks/acculynx — receive real-time job/milestone updates.
// Validates an optional shared secret, then maps the job id to a local lead.
export async function POST(req: Request) {
  try {
    const secret = process.env.ACCULYNX_WEBHOOK_SECRET;
    if (secret) {
      const provided =
        req.headers.get("x-acculynx-signature") || req.headers.get("x-webhook-secret");
      if (provided !== secret) return json({ error: "Invalid signature" }, 401);
    }

    const payload = (await req.json()) as {
      jobId?: string;
      id?: string;
      milestone?: string;
      status?: string;
    };
    const jobId = payload.jobId || payload.id;
    const milestone = payload.milestone || payload.status;
    if (!jobId) return json({ error: "Missing jobId" }, 400);

    const lead = await prisma.lead.findFirst({ where: { acculynxJobId: jobId } });
    if (!lead) {
      // Not an error — webhook may fire for jobs not created here.
      return json({ ok: true, matched: false });
    }

    if (milestone) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { acculynxStatus: milestone },
      });
    }
    return json({ ok: true, matched: true, leadId: lead.id });
  } catch (err) {
    return handleError(err);
  }
}
