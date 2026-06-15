import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

// PATCH /api/notifications/[id]/read
export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await prisma.notification.updateMany({
      where: { id: params.id, userId: user.id },
      data: { read: true },
    });
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
