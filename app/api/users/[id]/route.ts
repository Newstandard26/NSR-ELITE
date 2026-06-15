import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole, AuthError } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
  // AccuLynx user GUID — used to set the job sales owner.
  acculynxId: z.string().nullable().optional(),
  // Optional admin password reset.
  password: z.string().min(6).optional(),
});

// PATCH /api/users/[id] — edit a user (managers + admins).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const body = patchSchema.parse(await req.json());
    const { password, ...rest } = body;
    const data: Record<string, unknown> = { ...rest };
    if (body.email) data.email = body.email.toLowerCase();
    if (password) data.passwordHash = await bcrypt.hash(password, 10);

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

// DELETE /api/users/[id] — permanently remove a user (managers + admins).
// Leads keep their history (rep is unassigned); a user with appointments is
// blocked so booked work isn't silently destroyed — deactivate them instead.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const me = await requireRole("MANAGER", "ADMIN");
    if (me.id === params.id) {
      throw new AuthError(400, "You can't delete your own account.");
    }
    const appointments = await prisma.appointment.count({ where: { repId: params.id } });
    if (appointments > 0) {
      throw new AuthError(
        409,
        `This user has ${appointments} appointment(s). Deactivate them instead to keep that history.`,
      );
    }
    await prisma.user.delete({ where: { id: params.id } });
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
