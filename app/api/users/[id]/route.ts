import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  // AccuLynx user GUID — used to set the job sales owner.
  acculynxId: z.string().nullable().optional(),
});

// PATCH /api/users/[id] — edit a user (managers + admins).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const body = patchSchema.parse(await req.json());
    const data: Record<string, unknown> = { ...body };
    if (body.email) data.email = body.email.toLowerCase();

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        acculynxId: true,
      },
    });
    return json(user);
  } catch (err) {
    return handleError(err);
  }
}
