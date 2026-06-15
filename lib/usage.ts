import { prisma } from "@/lib/db";

// Only record a new "app open" at most once per this window, so a persistent
// (never-logs-out) session still registers ongoing usage without writing a row
// on every page navigation.
const WINDOW_MS = 30 * 60 * 1000;

// Records app usage for a logged-in user. Unlike the NextAuth signIn event
// (which only fires on a fresh authentication), this runs on normal app
// activity, so users on long-lived mobile sessions still count as active.
// Best effort — a tracking failure must never block rendering.
export async function touchActivity(userId: string): Promise<void> {
  try {
    const now = new Date();
    const cutoff = new Date(now.getTime() - WINDOW_MS);
    // Single atomic guard: only "claim" this window if the last activity is
    // outside it. Concurrent renders re-check after the first commits, so we
    // don't double-count a single session.
    const res = await prisma.user.updateMany({
      where: { id: userId, OR: [{ lastLoginAt: null }, { lastLoginAt: { lt: cutoff } }] },
      data: { lastLoginAt: now },
    });
    if (res.count > 0) {
      await prisma.loginEvent.create({ data: { userId } });
    }
  } catch (e) {
    console.error("touchActivity failed:", (e as Error).message);
  }
}
