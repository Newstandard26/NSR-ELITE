import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

// Photos are uploaded directly from the client to Cloudinary; this stores the
// resulting secure URL against the lead. (Client uses an unsigned upload preset.)
const schema = z.object({ url: z.string().url() });

// POST /api/leads/[id]/photos
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const { url } = schema.parse(await req.json());
    const lead = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!lead) return json({ error: "Lead not found" }, 404);
    const photo = await prisma.photo.create({ data: { leadId: lead.id, url } });
    return json(photo, 201);
  } catch (err) {
    return handleError(err);
  }
}
