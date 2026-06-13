import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { computeRepStats } from "@/lib/stats";

// GET /api/leaderboard — ranked rep performance. Visible to reps + managers.
export async function GET() {
  try {
    await requireUser();
    const stats = await computeRepStats();

    // Rank by weekly knocks, then appointments, then AccuLynx leads.
    const ranked = [...stats].sort(
      (a, b) =>
        b.knockedWeek - a.knockedWeek ||
        b.appointmentsSet - a.appointmentsSet ||
        b.acculynxLeads - a.acculynxLeads,
    );

    const topPerformerId = ranked[0]?.repId;
    return json({
      leaderboard: ranked.map((r, i) => ({ ...r, rank: i + 1, isTopPerformer: r.repId === topPerformerId })),
    });
  } catch (err) {
    return handleError(err);
  }
}
