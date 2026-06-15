import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { pushLeadToAccuLynx } from "@/lib/acculynx-push";
import { logActivity } from "@/lib/activity";
import { getIntegrationSettings } from "@/lib/settings";
import { notify } from "@/lib/notify";

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
        activities: { orderBy: { createdAt: "desc" }, take: 100 },
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
  lat: z.number().optional(),
  lng: z.number().optional(),
  dispositionStatusId: z.string().nullable().optional(),
  repId: z.string().nullable().optional(),
  territoryId: z.string().nullable().optional(),
  acculynxStatus: z.string().optional(),
});

// PATCH /api/leads/[id] — update lead, stamps dispositionAt on status change.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
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

    // Activity log.
    if (body.dispositionStatusId !== undefined) {
      await logActivity(
        lead.id,
        "status_changed",
        `Status changed to ${lead.dispositionStatus?.label ?? "none"}`,
        user.name,
      );
    }
    if (body.repId !== undefined) {
      await logActivity(
        lead.id,
        "rep_changed",
        lead.rep ? `Assigned to ${lead.rep.name}` : "Unassigned",
        user.name,
      );
      // Notify the newly assigned rep (unless they assigned it to themselves).
      if (body.repId && body.repId !== user.id) {
        await notify(body.repId, "lead_assigned", `${user.name} assigned you a lead: ${lead.address}`, lead.id);
      }
    }

    // Auto-push to AccuLynx when the lead reaches a configured trigger status
    // (or, if none configured, the "Customer" pipeline stage). Best effort.
    if (body.dispositionStatusId && !lead.acculynxJobId && process.env.ACCULYNX_API_KEY) {
      const settings = await getIntegrationSettings();
      const triggered =
        settings.triggerStatusIds.length > 0
          ? settings.triggerStatusIds.includes(body.dispositionStatusId)
          : lead.dispositionStatus?.pipelineStage === "Customer";
      if (triggered) {
        try {
          await pushLeadToAccuLynx(lead.id);
        } catch (e) {
          console.error("Auto-push to AccuLynx failed:", (e as Error).message);
        }
      }
    }

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
