import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

// GET /api/territories — list with assignments + lead counts.
export async function GET() {
  try {
    await requireUser();
    const territories = await prisma.territory.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: { user: { select: { id: true, name: true } } },
        },
        _count: { select: { leads: true } },
      },
    });
    return json(territories);
  } catch (err) {
    return handleError(err);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  geoJson: z.any(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  status: z.enum(["ACTIVE", "COMPLETED", "PENDING"]).default("ACTIVE"),
});

// POST /api/territories — managers/admins draw a new polygon.
export async function POST(req: Request) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const body = createSchema.parse(await req.json());
    const territory = await prisma.territory.create({
      data: {
        name: body.name,
        geoJson: body.geoJson ?? {},
        color: body.color,
        status: body.status,
      },
    });
    return json(territory, 201);
  } catch (err) {
    return handleError(err);
  }
}
