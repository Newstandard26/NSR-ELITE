import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { logActivity } from "@/lib/activity";

const patchSchema = z.object({
  scheduledAt: z.string().optional(),
  type: z.enum(["INSPECTION", "ESTIMATE", "FOLLOWUP"]).optional(),
  durationMinutes: z.number().int().optional(),
  notes: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
});

// PATCH /api/appointments/[id]
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = patchSchema.parse(await req.json());
    const data: Record<string, unknown> = { ...body };
    if (body.scheduledAt) data.scheduledAt = new Date(body.scheduledAt);
    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data,
      include: { rep: { select: { id: true, name: true } }, lead: true },
    });
    if (body.status === "COMPLETED") {
      await logActivity(appointment.leadId, "appointment_set", "Appointment marked complete", user.name);
    } else if (body.status === "CANCELLED") {
      await logActivity(appointment.leadId, "appointment_set", "Appointment canceled", user.name);
    }
    return json(appointment);
  } catch (err) {
    return handleError(err);
  }
}

// DELETE /api/appointments/[id]
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    await prisma.appointment.delete({ where: { id: params.id } });
    return json({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
