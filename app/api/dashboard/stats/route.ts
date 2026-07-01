import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { startOfToday, startOfWeek, startOfMonth, EPOCH } from "@/lib/time";

export const dynamic = "force-dynamic";

type Range = "today" | "week" | "month" | "all";

function windowFor(range: Range): { start: Date; end: Date } {
  const end = new Date();
  const start =
    range === "week" ? startOfWeek() : range === "month" ? startOfMonth() : range === "all" ? EPOCH : startOfToday();
  return { start, end };
}

// GET /api/dashboard/stats?range=today|week|month|all
export async function GET(req: Request) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const range = (new URL(req.url).searchParams.get("range") as Range) || "week";
    const { start, end } = windowFor(range);
    const inWindow = { gte: start, lte: end };

    const dispoWhere: Prisma.LeadWhereInput = { dispositionAt: inWindow };

    const [activeTerritories, totalLeads, knocked, appointments, acculynx] = await Promise.all([
      prisma.territory.count({ where: { status: "ACTIVE" } }),
      prisma.lead.count(),
      prisma.lead.count({ where: dispoWhere }),
      prisma.appointment.count({ where: { scheduledAt: inWindow } }),
      prisma.lead.count({ where: { acculynxJobId: { not: null }, updatedAt: inWindow } }),
    ]);
    const conversionPct = knocked > 0 ? Math.round((acculynx / knocked) * 100) : 0;

    // Pipeline + disposition breakdown for leads worked in the window.
    const byStatus = await prisma.lead.groupBy({
      by: ["dispositionStatusId"],
      where: dispoWhere,
      _count: { _all: true },
    });
    const statuses = await prisma.dispositionStatus.findMany({
      select: { id: true, label: true, color: true, pipelineStage: true },
    });
    const sMap = new Map(statuses.map((s) => [s.id, s]));
    const pipelineCounts: Record<string, { count: number; color: string }> = {};
    const byDisposition = byStatus
      .map((row) => {
        const s = row.dispositionStatusId ? sMap.get(row.dispositionStatusId) : undefined;
        const stage = s?.pipelineStage || "Unstaged";
        pipelineCounts[stage] = pipelineCounts[stage] || { count: 0, color: s?.color || "#6B7280" };
        pipelineCounts[stage].count += row._count._all;
        return { label: s?.label || "Unassigned", color: s?.color || "#6B7280", count: row._count._all };
      })
      .sort((a, b) => b.count - a.count);
    const pipeline = Object.entries(pipelineCounts)
      .map(([stage, v]) => ({ stage, count: v.count, color: v.color }))
      .sort((a, b) => b.count - a.count);

    // Recent activity within the window.
    const activityRows = await prisma.leadActivity.findMany({
      where: { createdAt: inWindow },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { lead: { select: { ownerName: true, address: true } } },
    });
    const recentActivity = activityRows.map((a) => ({
      id: a.id, type: a.type, description: a.description, actor: a.actor, createdAt: a.createdAt,
      lead: a.lead?.ownerName || a.lead?.address || "",
    }));

    // Rep performance within the window.
    const repUsers = await prisma.user.findMany({
      where: { role: { in: ["REP", "MANAGER"] }, isActive: true },
      select: { id: true, name: true },
    });
    const reps = await Promise.all(
      repUsers.map(async (r) => {
        const [doors, appts, ax] = await Promise.all([
          prisma.lead.count({ where: { repId: r.id, dispositionAt: inWindow } }),
          prisma.appointment.count({ where: { repId: r.id, scheduledAt: inWindow } }),
          prisma.lead.count({ where: { repId: r.id, acculynxJobId: { not: null }, updatedAt: inWindow } }),
        ]);
        return { repId: r.id, name: r.name, doors, appointmentsSet: appts, acculynxLeads: ax, conversionRate: doors > 0 ? Math.round((ax / doors) * 100) : 0 };
      }),
    );
    reps.sort((a, b) => b.doors - a.doors);

    // Live reps today (GPS pinged today, business-timezone day).
    const todayStart = startOfToday();
    const liveRaw = await prisma.repLocation.findMany({
      where: { timestamp: { gte: todayStart } },
      orderBy: { timestamp: "desc" },
      include: { user: { select: { id: true, name: true } } },
    });
    const seen = new Set<string>();
    const liveReps: { id: string; name: string; lastSeen: Date }[] = [];
    for (const l of liveRaw) {
      if (seen.has(l.userId)) continue;
      seen.add(l.userId);
      liveReps.push({ id: l.userId, name: l.user.name, lastSeen: l.timestamp });
    }

    return json({
      range,
      cards: { activeTerritories, totalLeads, knocked, appointments, acculynx, conversionPct },
      reps,
      pipeline,
      byDisposition,
      recentActivity,
      liveReps,
    });
  } catch (err) {
    return handleError(err);
  }
}
