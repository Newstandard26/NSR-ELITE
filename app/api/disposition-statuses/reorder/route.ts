import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

const reorderSchema = z.object({
  // Ordered list of pin ids — index becomes the new sortOrder.
  order: z.array(z.string()).min(1),
});

// PATCH /api/disposition-statuses/reorder — drag-and-drop sequence update.
export async function PATCH(req: Request) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const { order } = reorderSchema.parse(await req.json());

    await prisma.$transaction(
      order.map((id, idx) =>
        prisma.dispositionStatus.update({ where: { id }, data: { sortOrder: idx + 1 } }),
      ),
    );
    const updated = await prisma.dispositionStatus.findMany({ orderBy: { sortOrder: "asc" } });
    return json(updated);
  } catch (err) {
    return handleError(err);
  }
}
