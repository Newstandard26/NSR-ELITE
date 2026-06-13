import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { placeDetails } from "@/lib/places";

export const dynamic = "force-dynamic";

// GET /api/places/details?placeId=...&token=...
// Returns structured address + lat/lng for a chosen prediction.
export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const placeId = searchParams.get("placeId");
    if (!placeId) return json({ error: "Missing placeId" }, 400);
    const token = searchParams.get("token") || undefined;
    const details = await placeDetails(placeId, token);
    if (!details) return json({ error: "Place not found" }, 404);
    return json(details);
  } catch (err) {
    return handleError(err);
  }
}
