import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

// GET /api/territories/[id] — territory with coverage stats by disposition.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const territory = await prisma.territory.findUnique({
      where: { id: params.id },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { assignedAt: "desc" },
        },
      },
    });
    if (!territory) return json({ error: "Not found" }, 404);

    // Coverage breakdown: count leads grouped by disposition label.
    const leads = await prisma.lead.findMany({
      where: { territoryId: params.id },
      include: { dispositionStatus: { select: { label: true, color: true } } },
    });
    const total = leads.length;
    const byStatus: Record<string, { count: number; color: string }> = {};
    for (const l of leads) {
      const label = l.dispositionStatus?.label || "Unassigned";
      const color = l.dispositionStatus?.color || "#6B7280";
      byStatus[label] = byStatus[label] || { count: 0, color };
      byStatus[label].count++;
    }
    const knocked = leads.filter((l) => l.dispositionStatus?.label !== "Not Visited").length;

    return json({ territory, stats: { total, knocked, byStatus } });
  } catch (err) {
    return handleError(err);
  }
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  geoJson: z.any().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  status: z.enum(["ACTIVE", "COMPLETED", "PENDING"]).optional(),
});

// PATCH /api/territories/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const body = patchSchema.parse(await req.json());
    const territory = await prisma.territory.update({ where: { id: params.id }, data: body });
    return json(territory);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/territories/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER", "ADMIN");
    // Detach leads first so we don't orphan them.
    await prisma.lead.updateMany({ where: { territoryId: params.id }, data: { territoryId: null } });
    await prisma.territory.delete({ where: { id: params.id } });
    return json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
