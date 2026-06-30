import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { providerDiagnostics } from "@/lib/property";

export const dynamic = "force-dynamic";

// GET /api/settings/property-status — admin-only readout of which property-data
// provider the running server resolves to, and why. Never returns the API key.
export async function GET() {
  try {
    await requireRole("ADMIN");
    return json(providerDiagnostics());
  } catch (err) {
    return handleError(err);
  }
}
