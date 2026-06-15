import { prisma } from "@/lib/db";

export interface AcculynxSettings {
  acculynxLeadSourceId: string | null;
  triggerStatusIds: string[];
  milestoneMap: Record<string, string>;
}

const SINGLETON_ID = "default";

// Reads the singleton integration settings, creating it on first access.
export async function getIntegrationSettings(): Promise<AcculynxSettings> {
  const row = await prisma.integrationSettings.upsert({
    where: { id: SINGLETON_ID },
    update: {},
    create: { id: SINGLETON_ID },
  });
  return {
    acculynxLeadSourceId: row.acculynxLeadSourceId,
    triggerStatusIds: Array.isArray(row.triggerStatusIds) ? (row.triggerStatusIds as string[]) : [],
    milestoneMap:
      row.milestoneMap && typeof row.milestoneMap === "object"
        ? (row.milestoneMap as Record<string, string>)
        : {},
  };
}

export async function updateIntegrationSettings(patch: Partial<AcculynxSettings>) {
  return prisma.integrationSettings.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      acculynxLeadSourceId: patch.acculynxLeadSourceId ?? null,
      triggerStatusIds: patch.triggerStatusIds ?? [],
      milestoneMap: patch.milestoneMap ?? {},
    },
    update: {
      ...(patch.acculynxLeadSourceId !== undefined
        ? { acculynxLeadSourceId: patch.acculynxLeadSourceId }
        : {}),
      ...(patch.triggerStatusIds !== undefined ? { triggerStatusIds: patch.triggerStatusIds } : {}),
      ...(patch.milestoneMap !== undefined ? { milestoneMap: patch.milestoneMap } : {}),
    },
  });
}
