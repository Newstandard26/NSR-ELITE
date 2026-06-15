import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/notifications?unread=true — current user's notifications.
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const where = { userId: user.id, ...(searchParams.get("unread") === "true" ? { read: false } : {}) };
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
    ]);
    return json({ items, unread, where });
  } catch (err) {
    return handleError(err);
  }
}
