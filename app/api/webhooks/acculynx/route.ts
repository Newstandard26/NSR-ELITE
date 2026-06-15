import { prisma } from "@/lib/db";
import { handleError, json } from "@/lib/api";
import { logActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";

// POST /api/webhooks/acculynx?secret=... — receive real-time AccuLynx events.
// AccuLynx secures webhooks with a secret query param (no payload signing), so
// we validate ?secret against ACCULYNX_WEBHOOK_SECRET when configured.
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = process.env.ACCULYNX_WEBHOOK_SECRET;
    if (secret) {
      const provided =
        searchParams.get("secret") ||
        req.headers.get("x-acculynx-signature") ||
        req.headers.get("x-webhook-secret");
      if (provided !== secret) return json({ error: "Invalid secret" }, 401);
    }

    // AccuLynx topic-based payloads, with tolerant fallbacks for flat shapes.
    const payload = (await req.json().catch(() => ({}))) as {
      topic?: string;
      jobId?: string;
      id?: string;
      milestone?: { name?: string; id?: string } | string;
      status?: string;
    };

    const jobId = payload.jobId || payload.id;
    const milestoneName =
      typeof payload.milestone === "string"
        ? payload.milestone
        : payload.milestone?.name || payload.status;

    if (!jobId) return json({ ok: true, matched: false });

    const lead = await prisma.lead.findFirst({ where: { acculynxJobId: jobId } });
    if (!lead) {
      // Not an error — webhook may fire for jobs not created here.
      return json({ ok: true, matched: false });
    }

    if (milestoneName && milestoneName !== lead.acculynxStatus) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { acculynxStatus: milestoneName },
      });
      await logActivity(
        lead.id,
        "acculynx_milestone",
        `AccuLynx milestone changed to ${milestoneName}`,
        "AccuLynx",
        { topic: payload.topic, jobId },
      );
    }

    return json({ ok: true, matched: true, leadId: lead.id });
  } catch (err) {
    return handleError(err);
  }
}
