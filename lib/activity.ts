import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type ActivityType =
  | "lead_created"
  | "status_changed"
  | "note_added"
  | "rep_changed"
  | "acculynx_push"
  | "acculynx_milestone"
  | "lead_imported";

// Records an entry on a lead's activity feed. Best effort — logging a timeline
// event must never break the underlying operation.
export async function logActivity(
  leadId: string,
  type: ActivityType,
  description: string,
  actor?: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  try {
    await prisma.leadActivity.create({
      data: {
        leadId,
        type,
        description,
        actor: actor ?? null,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (e) {
    console.error("logActivity failed:", (e as Error).message);
  }
}
