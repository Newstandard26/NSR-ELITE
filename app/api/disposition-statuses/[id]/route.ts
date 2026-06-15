import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

const patchSchema = z.object({
  label: z.string().min(1).optional(),
  abbreviation: z.string().max(4).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().min(1).optional(),
  pipelineStage: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// PATCH /api/disposition-statuses/[id] — edit label, color, icon, default/active.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const body = patchSchema.parse(await req.json());

    const updated = await prisma.$transaction(async (tx) => {
      if (body.isDefault) {
        await tx.dispositionStatus.updateMany({
          where: { isDefault: true, id: { not: params.id } },
          data: { isDefault: false },
        });
      }
      return tx.dispositionStatus.update({ where: { id: params.id }, data: body });
    });
    return json(updated);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/disposition-statuses/[id] — soft delete (deactivate).
// Hard delete is refused if any lead still references the pin.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const count = await prisma.lead.count({ where: { dispositionStatusId: params.id } });
    if (count > 0) {
      // Preserve history — deactivate instead of removing.
      const archived = await prisma.dispositionStatus.update({
        where: { id: params.id },
        data: { isActive: false },
      });
      return json({ ...archived, softDeleted: true, leadsUsing: count });
    }
    await prisma.dispositionStatus.delete({ where: { id: params.id } });
    return json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
