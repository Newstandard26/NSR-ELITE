import { prisma } from "@/lib/db";

// Create an in-app notification for a user. Best effort.
export async function notify(
  userId: string | null | undefined,
  type: string,
  message: string,
  leadId?: string | null,
): Promise<void> {
  if (!userId) return;
  try {
    await prisma.notification.create({
      data: { userId, type, message, leadId: leadId ?? null },
    });
  } catch (e) {
    console.error("notify failed:", (e as Error).message);
  }
}
