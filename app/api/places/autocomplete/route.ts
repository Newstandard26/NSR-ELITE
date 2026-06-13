import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { placeAutocomplete } from "@/lib/places";

export const dynamic = "force-dynamic";

// GET /api/places/autocomplete?q=...&token=...
// Proxies Google Places autocomplete so the API key stays server-side.
export async function GET(req: Request) {
  try {
    await requireUser();
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const token = searchParams.get("token") || undefined;
    const predictions = await placeAutocomplete(q, token);
    return json({ predictions });
  } catch (err) {
    return handleError(err);
  }
}
