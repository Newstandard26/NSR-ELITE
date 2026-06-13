import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { computeRepStats } from "@/lib/stats";

// GET /api/reps — list reps with activity stats.
export async function GET() {
  try {
    await requireUser();
    const stats = await computeRepStats();
    return json(stats);
  } catch (err) {
    return handleError(err);
  }
}
