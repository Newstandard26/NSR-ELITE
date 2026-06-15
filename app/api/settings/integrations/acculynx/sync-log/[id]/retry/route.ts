import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { pushLeadToAccuLynx } from "@/lib/acculynx-push";

// POST /api/settings/integrations/acculynx/sync-log/[id]/retry
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const row = await prisma.syncLog.findUnique({ where: { id: params.id } });
    if (!row?.leadId) return json({ error: "No lead to retry" }, 400);
    const result = await pushLeadToAccuLynx(row.leadId);
    return json(result);
  } catch (err) {
    return handleError(err);
  }
}
