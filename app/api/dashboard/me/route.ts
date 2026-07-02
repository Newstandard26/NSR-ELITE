import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { startOfToday, startOfWeek } from "@/lib/stats";

export const dynamic = "force-dynamic";

// GET /api/dashboard/me — the current user's personal dashboard data.
export async function GET() {
  try {
    const user = await requireUser();
    const today = startOfToday();
    const week = startOfWeek();
    const now = new Date();

    const [doorsToday, appointmentsToday, leadsToday, acculynxWeek, doorsWeek] = await Promise.all([
      prisma.lead.count({ where: { repId: user.id, dispositionAt: { gte: today } } }),
      prisma.appointment.count({ where: { repId: user.id, scheduledAt: { gte: today }, status: "SCHEDULED" } }),
      // A "Lead" = a door pushed to AccuLynx (not just any pin created).
      prisma.lead.count({ where: { repId: user.id, acculynxJobId: { not: null }, acculynxPushedAt: { gte: today } } }),
      prisma.lead.count({ where: { repId: user.id, acculynxJobId: { not: null }, acculynxPushedAt: { gte: week } } }),
      prisma.lead.count({ where: { repId: user.id, dispositionAt: { gte: week } } }),
    ]);
    const conversionRate = doorsWeek > 0 ? Math.round((acculynxWeek / doorsWeek) * 100) : 0;

    // Upcoming appointments for me.
    const appointments = await prisma.appointment.findMany({
      where: { repId: user.id, status: "SCHEDULED", scheduledAt: { gte: now } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { lead: { select: { id: true, ownerName: true, address: true } } },
    });

    // Follow-ups: my leads in Callback / Not Home dispositions.
    const followUpStatuses = await prisma.dispositionStatus.findMany({
      where: {
        OR: [
          { label: { contains: "callback", mode: "insensitive" } },
          { label: { contains: "not home", mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    const followUps = await prisma.lead.findMany({
      where: { repId: user.id, dispositionStatusId: { in: followUpStatuses.map((s) => s.id) } },
      orderBy: { dispositionAt: "desc" },
      take: 10,
      include: { dispositionStatus: { select: { label: true, color: true, icon: true } } },
    });

    // My rank this week (by doors).
    const reps = await prisma.user.findMany({
      where: { role: { in: ["REP", "MANAGER"] }, isActive: true },
      select: { id: true },
    });
    const weeklyDoors = await Promise.all(
      reps.map(async (r) => ({
        id: r.id,
        doors: await prisma.lead.count({ where: { repId: r.id, dispositionAt: { gte: week } } }),
      })),
    );
    weeklyDoors.sort((a, b) => b.doors - a.doors);
    const rank = weeklyDoors.findIndex((r) => r.id === user.id) + 1;

    return json({
      snapshot: { doorsToday, appointmentsToday, leadsToday, conversionRate },
      appointments,
      followUps,
      rank: { rank: rank || null, total: reps.length, doorsWeek },
    });
  } catch (err) {
    return handleError(err);
  }
}
