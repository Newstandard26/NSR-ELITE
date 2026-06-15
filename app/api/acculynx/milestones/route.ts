import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { acculynx } from "@/lib/acculynx";

export const dynamic = "force-dynamic";

// GET /api/acculynx/milestones — AccuLynx job milestones for the mapping UI.
export async function GET() {
  try {
    await requireRole("MANAGER", "ADMIN");
    const milestones = await acculynx().getMilestones();
    return json(milestones);
  } catch (err) {
    return handleError(err);
  }
}
