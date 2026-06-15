import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

// PATCH /api/notifications/read-all
export async function PATCH() {
  try {
    const user = await requireUser();
    await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
