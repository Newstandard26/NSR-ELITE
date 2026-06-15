import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { acculynx } from "@/lib/acculynx";

export const dynamic = "force-dynamic";

// GET /api/acculynx/ping — test the AccuLynx connection.
export async function GET() {
  try {
    await requireRole("MANAGER", "ADMIN");
    if (!process.env.ACCULYNX_API_KEY) return json({ connected: false, reason: "No API key" });
    const ok = await acculynx().ping();
    return json({ connected: ok });
  } catch (err) {
    return handleError(err);
  }
}
