import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import {
  startOfToday, startOfWeek, startOfMonth,
  startOfPrevDay, startOfPrevWeek, startOfPrevMonth, EPOCH,
} from "@/lib/time";

export const dynamic = "force-dynamic";

type Range = "today" | "week" | "month" | "all";

// Business-timezone-aware windows, with the matching previous period for movement.
function windowFor(range: Range): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const end = new Date();
  let start: Date;
  let prevStart: Date;
  if (range === "week") {
    start = startOfWeek();
    prevStart = startOfPrevWeek();
  } else if (range === "month") {
    start = startOfMonth();
    prevStart = startOfPrevMonth();
  } else if (range === "all") {
    start = EPOCH;
    prevStart = EPOCH;
  } else {
    start = startOfToday();
    prevStart = startOfPrevDay();
  }
  return { start, end, prevStart, prevEnd: start };
}

interface Row { repId: string; name: string; doors: number; appointmentsSet: number; acculynxLeads: number; conversionRate: number; }

async function compute(start: Date, end: Date, territoryId?: string): Promise<Row[]> {
  const reps = await prisma.user.findMany({
    where: { role: { in: ["REP", "MANAGER", "ADMIN"] }, isActive: true },
    select: { id: true, name: true },
  });
  const territoryWhere: Prisma.LeadWhereInput = territoryId ? { territoryId } : {};
  const rows: Row[] = [];
  for (const rep of reps) {
    const [doors, appts, acculynxLeads] = await Promise.all([
      prisma.lead.count({ where: { ...territoryWhere, repId: rep.id, dispositionAt: { gte: start, lte: end } } }),
      prisma.appointment.count({ where: { repId: rep.id, createdAt: { gte: start, lte: end } } }),
      prisma.lead.count({ where: { ...territoryWhere, repId: rep.id, acculynxJobId: { not: null }, acculynxPushedAt: { gte: start, lte: end } } }),
    ]);
    rows.push({
      repId: rep.id, name: rep.name, doors, appointmentsSet: appts, acculynxLeads,
      conversionRate: doors > 0 ? Math.round((acculynxLeads / doors) * 100) : 0,
    });
  }
  return rows.sort((a, b) => b.doors - a.doors || b.appointmentsSet - a.appointmentsSet);
}

// GET /api/leaderboard?range=week&territory=
export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const range = (searchParams.get("range") as Range) || "week";
    const territory = searchParams.get("territory") || undefined;
    const { start, end, prevStart, prevEnd } = windowFor(range);

    const current = await compute(start, end, territory);
    const previous = await compute(prevStart, prevEnd, territory);
    const prevRank = new Map(previous.map((r, i) => [r.repId, i + 1]));

    const leaderboard = current.map((r, i) => {
      const rank = i + 1;
      const was = prevRank.get(r.repId);
      const movement = was == null ? 0 : was - rank; // +ve = moved up
      return { ...r, rank, movement, isTopPerformer: i === 0 };
    });

    return json({ leaderboard });
  } catch (err) {
    return handleError(err);
  }
}
