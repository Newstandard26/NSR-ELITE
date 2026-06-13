import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

const schema = z.object({
  lat: z.number(),
  lng: z.number(),
});

// POST /api/reps/location — rep posts a GPS ping (every ~5 min in foreground).
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { lat, lng } = schema.parse(await req.json());
    const loc = await prisma.repLocation.create({ data: { userId: user.id, lat, lng } });
    return json(loc, 201);
  } catch (err) {
    return handleError(err);
  }
}
