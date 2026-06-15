import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

export const dynamic = "force-dynamic";

const RANGE_DAYS: Record<string, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

// GET /api/settings/analytics?range=30d — admin-only team usage analytics.
// Combines login tracking with in-app activity so managers can see who is
// actually utilizing the app.
export async function GET(req: Request) {
  try {
    await requireRole("ADMIN");

    const url = new URL(req.url);
    const range = url.searchParams.get("range") ?? "30d";
    const days = range in RANGE_DAYS ? RANGE_DAYS[range] : 30;
    const since = days == null ? new Date(0) : new Date(Date.now() - days * 86_400_000);

    const [users, loginRows, apptAgg, gpsAgg, noteAgg, leadAgg] = await Promise.all([
      prisma.user.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true },
      }),
      // Distinct active days + login count + last login, per user, within range.
      prisma.$queryRaw<{ userId: string; logins: bigint; activeDays: bigint; lastLogin: Date }[]>`
        SELECT "userId",
               COUNT(*)                          AS "logins",
               COUNT(DISTINCT DATE("createdAt")) AS "activeDays",
               MAX("createdAt")                  AS "lastLogin"
        FROM "LoginEvent"
        WHERE "createdAt" >= ${since}
        GROUP BY "userId"
      `,
      prisma.appointment.groupBy({
        by: ["repId"],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      prisma.repLocation.groupBy({
        by: ["userId"],
        where: { timestamp: { gte: since } },
        _count: { _all: true },
        _max: { timestamp: true },
      }),
      prisma.note.groupBy({
        by: ["authorUserId"],
        where: { createdAt: { gte: since }, authorUserId: { not: null } },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      prisma.lead.groupBy({
        by: ["repId"],
        where: { updatedAt: { gte: since }, repId: { not: null } },
        _count: { _all: true },
        _max: { updatedAt: true },
      }),
    ]);

    const loginMap = new Map(loginRows.map((r) => [r.userId, r]));
    const apptMap = new Map(apptAgg.map((r) => [r.repId, r]));
    const gpsMap = new Map(gpsAgg.map((r) => [r.userId, r]));
    const noteMap = new Map(noteAgg.map((r) => [r.authorUserId as string, r]));
    const leadMap = new Map(leadAgg.map((r) => [r.repId as string, r]));

    const rows = users.map((u) => {
      const lg = loginMap.get(u.id);
      const gps = gpsMap.get(u.id);
      const appt = apptMap.get(u.id);
      const note = noteMap.get(u.id);
      const lead = leadMap.get(u.id);
      const logins = lg ? Number(lg.logins) : 0;
      const activeDays = lg ? Number(lg.activeDays) : 0;
      const appts = appt?._count._all ?? 0;
      const gpsPings = gps?._count._all ?? 0;
      const notes = note?._count._all ?? 0;
      const leads = lead?._count._all ?? 0;

      // Last activity = the most recent signal across login OR any in-app work.
      // This keeps users who stay logged in (persistent mobile sessions) from
      // looking inactive just because they didn't re-authenticate.
      const stamps = [
        u.lastLoginAt,
        appt?._max.createdAt,
        gps?._max.timestamp,
        note?._max.createdAt,
        lead?._max.updatedAt,
      ].filter(Boolean) as Date[];
      const lastActiveAt = stamps.length
        ? new Date(Math.max(...stamps.map((d) => d.getTime())))
        : null;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        lastLoginAt: u.lastLoginAt,
        logins,
        activeDays,
        appts,
        gpsPings,
        notes,
        leads,
        lastActiveAt,
        // Did this user do anything trackable in the window?
        engaged: logins + appts + gpsPings + notes + leads > 0,
      };
    });

    const summary = {
      totalUsers: rows.length,
      activeUsers: rows.filter((r) => r.isActive).length,
      engagedUsers: rows.filter((r) => r.engaged).length,
      // Active accounts that did nothing trackable in the range — the people
      // who actually aren't utilizing the app.
      dormantUsers: rows.filter((r) => r.isActive && !r.engaged).length,
    };

    return json({ range, since: since.toISOString(), generatedAt: new Date().toISOString(), summary, rows });
  } catch (err) {
    return handleError(err);
  }
}
