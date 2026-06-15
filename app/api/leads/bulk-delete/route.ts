import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

const schema = z.object({ ids: z.array(z.string()).min(1) });

// POST /api/leads/bulk-delete — managers/admins only.
export async function POST(req: Request) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const { ids } = schema.parse(await req.json());
    const result = await prisma.lead.deleteMany({ where: { id: { in: ids } } });
    return json({ deleted: result.count });
  } catch (err) {
    return handleError(err);
  }
}
