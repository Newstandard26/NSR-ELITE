import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

export const dynamic = "force-dynamic";

const schema = z.object({ password: z.string().min(1) });

// DELETE /api/profile — delete your own account (self-service, store-required).
// We remove personal data and disable access. Business records you created
// (leads, appointments) are retained but disassociated/anonymized so referential
// integrity and operational history are preserved.
export async function DELETE(req: Request) {
  try {
    const sessionUser = await requireUser();
    const { password } = schema.parse(await req.json());

    const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!user) return json({ error: "Account not found" }, 404);
    // Require the current password to confirm (unless the account has none).
    if (user.passwordHash) {
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return json({ error: "Password is incorrect" }, 400);
    }

    const id = user.id;
    await prisma.$transaction([
      // Delete personal data outright.
      prisma.repLocation.deleteMany({ where: { userId: id } }),
      prisma.loginEvent.deleteMany({ where: { userId: id } }),
      prisma.notification.deleteMany({ where: { userId: id } }),
      prisma.inviteToken.deleteMany({ where: { userId: id } }),
      // Disassociate authored notes (keep the note content as a business record).
      prisma.note.updateMany({ where: { authorUserId: id }, data: { authorUserId: null } }),
      // Anonymize the account and disable sign-in.
      prisma.user.update({
        where: { id },
        data: {
          name: "Deleted User",
          email: `deleted-${id}@deleted.invalid`,
          passwordHash: null,
          isActive: false,
          acculynxId: null,
          dailyTarget: null,
          weeklyTarget: null,
        },
      }),
    ]);

    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
