import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

export const dynamic = "force-dynamic";

type Range = "today" | "week" | "month" | "all";

function windowFor(range: Range): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const end = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (range === "week") start.setDate(start.getDate() - start.getDay());
  else if (range === "month") start.setDate(1);
  else if (range === "all") start.setFullYear(2000);
  // Previous comparable window.
  const span = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime());
  const prevStart = new Date(start.getTime() - span);
  return { start, end, prevStart, prevEnd };
}

interface Row { repId: string; name: string; doors: number; appointmentsSet: number; acculynxLeads: number; conversionRate: number; }

async function compute(start: Date, end: Date, territoryId?: string): Promise<Row[]> {
  const reps = await prisma.user.findMany({
    where: { role: { in: ["REP", "MANAGER"] }, isActive: true },
    select: { id: true, name: true },
  });
  const territoryWhere: Prisma.LeadWhereInput = territoryId ? { territoryId } : {};
  const rows: Row[] = [];
  for (const rep of reps) {
    const [doors, appts, acculynxLeads] = await Promise.all([
      prisma.lead.count({ where: { ...territoryWhere, repId: rep.id, dispositionAt: { gte: start, lte: end } } }),
      prisma.appointment.count({ where: { repId: rep.id, createdAt: { gte: start, lte: end } } }),
      prisma.lead.count({ where: { ...territoryWhere, repId: rep.id, acculynxJobId: { not: null }, updatedAt: { gte: start, lte: end } } }),
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
