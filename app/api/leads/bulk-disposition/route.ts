import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

const schema = z.object({
  ids: z.array(z.string()).min(1),
  dispositionStatusId: z.string(),
});

// POST /api/leads/bulk-disposition — change disposition on many leads.
export async function POST(req: Request) {
  try {
    await requireUser();
    const { ids, dispositionStatusId } = schema.parse(await req.json());
    const result = await prisma.lead.updateMany({
      where: { id: { in: ids } },
      data: { dispositionStatusId, dispositionAt: new Date() },
    });
    return json({ updated: result.count });
  } catch (err) {
    return handleError(err);
  }
}
