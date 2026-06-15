import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/settings/integrations/acculynx/sync-log?status=&direction=&days=
export async function GET(req: Request) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const { searchParams } = new URL(req.url);
    const where: Prisma.SyncLogWhereInput = {};
    if (searchParams.get("status")) where.status = searchParams.get("status")!;
    if (searchParams.get("direction")) where.direction = searchParams.get("direction")!;
    const days = parseInt(searchParams.get("days") || "7", 10);
    if (days > 0) {
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.createdAt = { gte: since };
    }

    const rows = await prisma.syncLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Attach lead labels.
    const leadIds = [...new Set(rows.map((r) => r.leadId).filter(Boolean) as string[])];
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, ownerName: true, address: true },
    });
    const leadMap = new Map(leads.map((l) => [l.id, l.ownerName || l.address]));

    return json(
      rows.map((r) => ({ ...r, leadLabel: r.leadId ? leadMap.get(r.leadId) ?? "" : "" })),
    );
  } catch (err) {
    return handleError(err);
  }
}
