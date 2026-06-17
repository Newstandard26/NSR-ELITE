import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { enrichLead, enrichmentEnabled } from "@/lib/property";

export const dynamic = "force-dynamic";

// POST /api/leads/[id]/enrich — pull property data for a lead (on demand).
// Gated by the PROPERTY_ENRICHMENT_ENABLED feature flag.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    if (!enrichmentEnabled()) {
      return json({ error: "Property enrichment is not enabled" }, 503);
    }
    const record = await enrichLead(params.id, user.name ?? undefined);
    return json({ propertyRecord: record });
  } catch (err) {
    return handleError(err);
  }
}
