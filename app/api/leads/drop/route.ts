import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { reverseGeocode } from "@/lib/geocode";
import { logActivity } from "@/lib/activity";

const schema = z.object({ lat: z.number(), lng: z.number() });

// POST /api/leads/drop — quick "tap a house" pin from the map.
// Reverse-geocodes the point, creates a lead at that location with the default
// disposition, auto-assigned to the rep. Returns the new lead.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { lat, lng } = schema.parse(await req.json());

    const addr = await reverseGeocode(lat, lng);
    const defaultStatus = await prisma.dispositionStatus.findFirst({ where: { isDefault: true } });

    const lead = await prisma.lead.create({
      data: {
        address: addr.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        lat,
        lng,
        dispositionStatusId: defaultStatus?.id,
        dispositionAt: defaultStatus ? new Date() : undefined,
        // Auto-assign the knock to whoever logged it (rep, manager, or admin);
        // managers can reassign afterward.
        repId: user.id,
      },
      include: { dispositionStatus: true, rep: { select: { id: true, name: true } } },
    });
    await logActivity(lead.id, "lead_created", "Pin dropped on map", user.name);
    return json(lead, 201);
  } catch (err) {
    return handleError(err);
  }
}
