import { prisma } from "@/lib/db";
import { startOfToday, startOfWeek, startOfMonth } from "@/lib/time";

// Re-exported for existing importers; boundaries are business-timezone aware.
export { startOfToday, startOfWeek, startOfMonth };

// A "knock" = any lead whose disposition was set/updated in the window by a rep.
// We approximate knocks via dispositionAt timestamps.
export interface RepStats {
  repId: string;
  name: string;
  knockedToday: number;
  knockedWeek: number;
  knockedMonth: number;
  appointmentsSet: number;
  acculynxLeads: number;
  conversionRate: number; // acculynx leads / knocks (week)
}

export async function computeRepStats(): Promise<RepStats[]> {
  const today = startOfToday();
  const week = startOfWeek();
  const month = startOfMonth();

  // Everyone who can own/work a lead — reps, plus managers and admins who also
  // canvass — so they're all selectable when assigning a logged knock.
  const reps = await prisma.user.findMany({
    where: { role: { in: ["REP", "MANAGER", "ADMIN"] }, isActive: true },
    select: { id: true, name: true },
  });

  const stats: RepStats[] = [];
  for (const rep of reps) {
    const [knockedToday, knockedWeek, knockedMonth, appts, acculynxLeads] = await Promise.all([
      prisma.lead.count({ where: { repId: rep.id, dispositionAt: { gte: today } } }),
      prisma.lead.count({ where: { repId: rep.id, dispositionAt: { gte: week } } }),
      prisma.lead.count({ where: { repId: rep.id, dispositionAt: { gte: month } } }),
      prisma.appointment.count({ where: { repId: rep.id, createdAt: { gte: week } } }),
      prisma.lead.count({
        where: { repId: rep.id, acculynxJobId: { not: null }, acculynxPushedAt: { gte: week } },
      }),
    ]);
    stats.push({
      repId: rep.id,
      name: rep.name,
      knockedToday,
      knockedWeek,
      knockedMonth,
      appointmentsSet: appts,
      acculynxLeads,
      conversionRate: knockedWeek > 0 ? Math.round((acculynxLeads / knockedWeek) * 100) : 0,
    });
  }
  return stats;
}
