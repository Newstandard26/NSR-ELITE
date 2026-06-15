import { prisma } from "@/lib/db";

export async function logSync(
  direction: "to_acculynx" | "from_acculynx",
  event: string,
  status: "success" | "failed" | "pending",
  opts: { leadId?: string | null; error?: string } = {},
): Promise<void> {
  try {
    await prisma.syncLog.create({
      data: {
        direction,
        event,
        status,
        leadId: opts.leadId ?? null,
        errorMessage: opts.error ?? null,
      },
    });
  } catch (e) {
    console.error("logSync failed:", (e as Error).message);
  }
}
