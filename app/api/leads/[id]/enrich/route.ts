import { requireUser, AuthError } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { enrichLead, enrichmentEnabled } from "@/lib/property";

export const dynamic = "force-dynamic";

// POST /api/leads/[id]/enrich — pull property data for a lead (on demand).
// Gated by the PROPERTY_ENRICHMENT_ENABLED feature flag.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (!enrichmentEnabled()) {
      return json({ error: "Property enrichment is not enabled" }, 503);
    }
    const force = new URL(req.url).searchParams.get("force") === "1";
    const record = await enrichLead(params.id, user.name ?? undefined, { force });
    return json({ propertyRecord: record });
  } catch (err) {
    // Preserve auth errors; otherwise surface the provider error message so a
    // failed lookup is diagnosable (e.g. a BatchData HTTP/mapping error) instead
    // of a generic 500.
    if (err instanceof AuthError) return handleError(err);
    console.error("Property enrich failed:", err);
    return json({ error: `Lookup failed: ${(err as Error).message}` }, 502);
  }
}
