import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { computeRepStats, startOfToday, startOfWeek } from "@/lib/stats";

// GET /api/dashboard/stats — aggregate stats for the manager dashboard.
export async function GET() {
  try {
    await requireRole("MANAGER", "ADMIN");
    const today = startOfToday();
    const week = startOfWeek();

    const [
      activeTerritories,
      totalLeads,
      knockedToday,
      appointmentsToday,
      acculynxThisWeek,
      knockedThisWeek,
    ] = await Promise.all([
      prisma.territory.count({ where: { status: "ACTIVE" } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { dispositionAt: { gte: today } } }),
      prisma.appointment.count({ where: { createdAt: { gte: today } } }),
      prisma.lead.count({ where: { acculynxJobId: { not: null }, updatedAt: { gte: week } } }),
      prisma.lead.count({ where: { dispositionAt: { gte: week } } }),
    ]);

    const conversionPct =
      knockedThisWeek > 0 ? Math.round((acculynxThisWeek / knockedThisWeek) * 100) : 0;

    const repStats = await computeRepStats();

    // Pipeline funnel: lead counts grouped by their disposition's pipeline stage.
    const byStatus = await prisma.lead.groupBy({
      by: ["dispositionStatusId"],
      _count: { _all: true },
    });
    const statuses = await prisma.dispositionStatus.findMany({
      select: { id: true, pipelineStage: true, color: true },
    });
    const stageMap = new Map(statuses.map((s) => [s.id, s]));
    const pipelineCounts: Record<string, { count: number; color: string }> = {};
    for (const row of byStatus) {
      const s = row.dispositionStatusId ? stageMap.get(row.dispositionStatusId) : undefined;
      const stage = s?.pipelineStage || "Unstaged";
      pipelineCounts[stage] = pipelineCounts[stage] || { count: 0, color: s?.color || "#6B7280" };
      pipelineCounts[stage].count += row._count._all;
    }
    const pipeline = Object.entries(pipelineCounts)
      .map(([stage, v]) => ({ stage, count: v.count, color: v.color }))
      .sort((a, b) => b.count - a.count);

    // Recent team activity.
    const activityRows = await prisma.leadActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { lead: { select: { ownerName: true, address: true } } },
    });
    const recentActivity = activityRows.map((a) => ({
      id: a.id,
      type: a.type,
      description: a.description,
      actor: a.actor,
      createdAt: a.createdAt,
      lead: a.lead?.ownerName || a.lead?.address || "",
    }));

    return json({
      cards: {
        activeTerritories,
        totalLeads,
        knockedToday,
        appointmentsToday,
        acculynxThisWeek,
        conversionPct,
      },
      reps: repStats,
      pipeline,
      recentActivity,
    });
  } catch (err) {
    return handleError(err);
  }
}
