import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { acculynx } from "@/lib/acculynx";

export const dynamic = "force-dynamic";

// GET /api/acculynx/lead-sources — proxy AccuLynx lead sources (server-side).
export async function GET() {
  try {
    await requireRole("MANAGER", "ADMIN");
    const sources = await acculynx().getLeadSources();
    return json(sources);
  } catch (err) {
    return handleError(err);
  }
}
