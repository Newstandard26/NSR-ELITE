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
    });
  } catch (err) {
    return handleError(err);
  }
}
