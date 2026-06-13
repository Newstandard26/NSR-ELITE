import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

const patchSchema = z.object({
  scheduledAt: z.string().optional(),
  type: z.enum(["INSPECTION", "ESTIMATE", "FOLLOWUP"]).optional(),
  notes: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
});

// PATCH /api/appointments/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const body = patchSchema.parse(await req.json());
    const data: Record<string, unknown> = { ...body };
    if (body.scheduledAt) data.scheduledAt = new Date(body.scheduledAt);
    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data,
      include: { rep: { select: { id: true, name: true } }, lead: true },
    });
    return json(appointment);
  } catch (err) {
    return handleError(err);
  }
}
