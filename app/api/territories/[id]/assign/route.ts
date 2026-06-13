import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

const schema = z.object({
  // Full set of rep ids that should be currently assigned to this territory.
  userIds: z.array(z.string()),
});

// POST /api/territories/[id]/assign — reconcile rep assignments.
// Closes out reps no longer in the list (keeps history) and opens new ones.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const { userIds } = schema.parse(await req.json());

    const current = await prisma.territoryAssignment.findMany({
      where: { territoryId: params.id, unassignedAt: null },
    });
    const currentIds = new Set(current.map((a) => a.userId));
    const nextIds = new Set(userIds);

    const toClose = current.filter((a) => !nextIds.has(a.userId));
    const toOpen = userIds.filter((id) => !currentIds.has(id));

    await prisma.$transaction([
      ...toClose.map((a) =>
        prisma.territoryAssignment.update({
          where: { id: a.id },
          data: { unassignedAt: new Date() },
        }),
      ),
      ...toOpen.map((userId) =>
        prisma.territoryAssignment.create({ data: { territoryId: params.id, userId } }),
      ),
    ]);

    const assignments = await prisma.territoryAssignment.findMany({
      where: { territoryId: params.id, unassignedAt: null },
      include: { user: { select: { id: true, name: true } } },
    });
    return json(assignments);
  } catch (err) {
    return handleError(err);
  }
}
