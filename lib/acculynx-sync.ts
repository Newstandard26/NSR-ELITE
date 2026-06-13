import { prisma } from "@/lib/db";
import { acculynx } from "@/lib/acculynx";

// Shared sync routine used by the manual endpoint and the 15-min background job.
// Walks every lead with an AccuLynx job id and refreshes its milestone status.
export async function syncAcculynxLeads(): Promise<{ checked: number; updated: number; errors: number }> {
  const linked = await prisma.lead.findMany({
    where: { acculynxJobId: { not: null } },
    select: { id: true, acculynxJobId: true, acculynxStatus: true },
  });

  const svc = acculynx();
  let updated = 0;
  let errors = 0;

  for (const lead of linked) {
    if (!lead.acculynxJobId) continue;
    try {
      const job = await svc.getJob(lead.acculynxJobId);
      const milestone = job.milestone;
      if (milestone && milestone !== lead.acculynxStatus) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { acculynxStatus: milestone },
        });
        updated++;
      }
    } catch (e) {
      errors++;
      console.error(`Sync failed for job ${lead.acculynxJobId}:`, (e as Error).message);
    }
  }

  return { checked: linked.length, updated, errors };
}
