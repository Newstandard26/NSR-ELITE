import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

// PATCH /api/auth/password — change your own password.
export async function PATCH(req: Request) {
  try {
    const sessionUser = await requireUser();
    const { currentPassword, newPassword } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user?.passwordHash) return json({ error: "No password set" }, 400);

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return json({ error: "Current password is incorrect" }, 400);

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
