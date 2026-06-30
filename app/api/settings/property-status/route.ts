import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { providerDiagnostics } from "@/lib/property";

export const dynamic = "force-dynamic";

// GET /api/settings/property-status — admin-only readout of which property-data
// provider the running server resolves to, plus the most recent ATTOM record's
// raw response (for field-mapping verification). Never returns the API key.
export async function GET() {
  try {
    await requireRole("ADMIN");
    const latestAttomRecord = await prisma.propertyRecord.findFirst({
      where: { source: "attom" },
      orderBy: { fetchedAt: "desc" },
    });
    return json({ ...providerDiagnostics(), latestAttomRecord });
  } catch (err) {
    return handleError(err);
  }
}
