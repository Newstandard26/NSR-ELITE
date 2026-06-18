import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

// GET /api/disposition-statuses
// Lists statuses used by the map and rep dropdown.
// ?all=true returns archived too (for the settings filter panel).
export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get("all") === "true";
    const statuses = await prisma.dispositionStatus.findMany({
      where: includeArchived ? {} : { isActive: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { leads: true } } },
    });
    return json(statuses);
  } catch (err) {
    return handleError(err);
  }
}

const createSchema = z.object({
  label: z.string().min(1),
  abbreviation: z.string().max(4).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color"),
  icon: z.string().min(1),
  pipelineStage: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});

// POST /api/disposition-statuses — create a pin (managers + admins only).
export async function POST(req: Request) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const body = createSchema.parse(await req.json());

    const created = await prisma.$transaction(async (tx) => {
      // Only one default at a time.
      if (body.isDefault) {
        await tx.dispositionStatus.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      }
      const max = await tx.dispositionStatus.aggregate({ _max: { sortOrder: true } });
      return tx.dispositionStatus.create({
        data: {
          label: body.label,
          abbreviation: body.abbreviation || null,
          color: body.color,
          icon: body.icon,
          pipelineStage: body.pipelineStage || null,
          isDefault: body.isDefault ?? false,
          sortOrder: (max._max.sortOrder ?? 0) + 1,
        },
      });
    });
    return json(created, 201);
  } catch (err) {
    return handleError(err);
  }
}
