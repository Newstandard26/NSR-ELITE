import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

const schema = z.object({
  ids: z.array(z.string()).min(1),
  repId: z.string().nullable(),
});

// POST /api/leads/bulk-assign — reassign many leads to a rep (managers/admins).
export async function POST(req: Request) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const { ids, repId } = schema.parse(await req.json());
    const result = await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: { repId: repId ?? null },
    });
    return json({ updated: result.count });
  } catch (err) {
    return handleError(err);
  }
}
