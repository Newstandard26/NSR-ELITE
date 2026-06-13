import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { acculynx } from "@/lib/acculynx";

const schema = z.object({
  content: z.string().min(1),
  // When true and the lead is linked, also push the note to AccuLynx.
  pushToAcculynx: z.boolean().optional(),
});

// POST /api/leads/[id]/notes — add a timestamped note authored by the current user.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = schema.parse(await req.json());

    const lead = await prisma.lead.findUnique({ where: { id: params.id } });
    if (!lead) return json({ error: "Lead not found" }, 404);

    const note = await prisma.note.create({
      data: {
        leadId: lead.id,
        content: body.content,
        author: user.name || user.email || "Rep",
        authorUserId: user.id,
      },
    });

    if (body.pushToAcculynx && lead.acculynxJobId) {
      try {
        await acculynx().addNote(lead.acculynxJobId, body.content);
      } catch (e) {
        // Don't fail the local note if the CRM push errors.
        console.error("AccuLynx note push failed:", e);
      }
    }

    return json(note, 201);
  } catch (err) {
    return handleError(err);
  }
}
