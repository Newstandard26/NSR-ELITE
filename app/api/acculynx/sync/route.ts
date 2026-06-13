import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { syncAcculynxLeads } from "@/lib/acculynx-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/acculynx/sync — manual trigger.
// Also safe to call from a cron / scheduled job every 15 minutes. When invoked
// by a scheduler, pass header `x-cron-secret: $CRON_SECRET` to bypass the role
// check (set CRON_SECRET in the environment).
export async function GET(req: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const provided = req.headers.get("x-cron-secret");
    if (!(cronSecret && provided === cronSecret)) {
      await requireRole("MANAGER", "ADMIN");
    }
    const result = await syncAcculynxLeads();
    return json({ ok: true, ...result });
  } catch (err) {
    return handleError(err);
  }
}
