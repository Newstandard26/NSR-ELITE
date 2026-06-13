import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

// GET /api/leads/[id] — full lead with notes, photos, appointments.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        dispositionStatus: true,
        rep: { select: { id: true, name: true } },
        territory: { select: { id: true, name: true } },
        notes: { orderBy: { createdAt: "desc" } },
        photos: { orderBy: { createdAt: "desc" } },
        appointments: { orderBy: { scheduledAt: "asc" } },
      },
    });
    if (!lead) return json({ error: "Not found" }, 404);
    return json(lead);
  } catch (err) {
    return handleError(err);
  }
}

const patchSchema = z.object({
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  roofAge: z.number().int().nullable().optional(),
  insuranceCompany: z.string().optional(),
  dispositionStatusId: z.string().nullable().optional(),
  repId: z.string().nullable().optional(),
  territoryId: z.string().nullable().optional(),
  acculynxStatus: z.string().optional(),
});

// PATCH /api/leads/[id] — update lead, stamps dispositionAt on status change.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const body = patchSchema.parse(await req.json());

    const data: Record<string, unknown> = { ...body };
    if (body.email === "") data.email = null;
    if (body.dispositionStatusId !== undefined) {
      data.dispositionAt = new Date();
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data,
      include: {
        dispositionStatus: true,
        rep: { select: { id: true, name: true } },
      },
    });
    return json(lead);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/leads/[id] — managers/admins only.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER", "ADMIN");
    await prisma.lead.delete({ where: { id: params.id } });
    return json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
