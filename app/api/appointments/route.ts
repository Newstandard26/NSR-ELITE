import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { acculynx } from "@/lib/acculynx";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { startOfToday, startOfWeek, startOfMonth } from "@/lib/time";

// GET /api/appointments — reps see their own; managers/admins see all.
// Filters: rep, from, to, status
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const where: Prisma.AppointmentWhereInput = {};

    if (user.role === "REP") where.repId = user.id;
    else if (searchParams.get("rep")) where.repId = searchParams.get("rep")!;

    if (searchParams.get("status")) where.status = searchParams.get("status")!;
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from || to) {
      where.scheduledAt = {};
      if (from) where.scheduledAt.gte = new Date(from);
      if (to) where.scheduledAt.lte = new Date(to);
    }
    // Range drill-down from the dashboard "Appointments" card (matches its count,
    // which scopes scheduledAt to the window up to now).
    const range = searchParams.get("range");
    if (range && range !== "all") {
      const start = range === "week" ? startOfWeek() : range === "month" ? startOfMonth() : startOfToday();
      where.scheduledAt = { gte: start, lte: new Date() };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      include: {
        rep: { select: { id: true, name: true } },
        lead: { select: { id: true, address: true, ownerName: true, lat: true, lng: true } },
      },
    });
    return json(appointments);
  } catch (err) {
    return handleError(err);
  }
}

const createSchema = z.object({
  leadId: z.string(),
  scheduledAt: z.string(), // ISO datetime
  type: z.enum(["INSPECTION", "ESTIMATE", "FOLLOWUP"]).default("INSPECTION"),
  durationMinutes: z.number().int().optional(),
  notes: z.string().optional(),
  repId: z.string().optional(),
  pushToAcculynx: z.boolean().optional(),
});

// POST /api/appointments — auto-assigned to creating rep unless repId given.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await req.json());

    const appointment = await prisma.appointment.create({
      data: {
        leadId: body.leadId,
        repId: body.repId ?? user.id,
        scheduledAt: new Date(body.scheduledAt),
        type: body.type,
        durationMinutes: body.durationMinutes ?? 60,
        notes: body.notes,
      },
      include: {
        rep: { select: { id: true, name: true } },
        lead: { select: { id: true, address: true, ownerName: true, acculynxJobId: true } },
      },
    });

    await logActivity(
      appointment.leadId,
      "appointment_set",
      `Appointment (${body.type.toLowerCase()}) scheduled for ${new Date(body.scheduledAt).toLocaleString()}`,
      user.name,
    );
    if (appointment.repId !== user.id) {
      await notify(appointment.repId, "appointment", `New appointment: ${appointment.lead.address} on ${new Date(body.scheduledAt).toLocaleString()}`, appointment.leadId);
    }

    if (body.pushToAcculynx && appointment.lead.acculynxJobId) {
      try {
        const when = new Date(body.scheduledAt).toLocaleString();
        await acculynx().addNote(
          appointment.lead.acculynxJobId,
          `Appointment (${body.type}) scheduled for ${when}. ${body.notes || ""}`.trim(),
        );
      } catch (e) {
        console.error("AccuLynx appointment note failed:", e);
      }
    }

    return json(appointment, 201);
  } catch (err) {
    return handleError(err);
  }
}
