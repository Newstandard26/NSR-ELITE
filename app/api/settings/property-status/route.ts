import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { providerDiagnostics } from "@/lib/property";

export const dynamic = "force-dynamic";

// Summarize an object one level deep: for each key, list its child keys (or the
// scalar value). Lets us see ATTOM's response structure compactly.
function shape(obj: unknown): unknown {
  if (!obj || typeof obj !== "object") return obj;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    out[k] = v && typeof v === "object" ? Object.keys(v as object) : v;
  }
  return out;
}

// GET /api/settings/property-status — admin-only readout of which property-data
// provider the running server resolves to, plus the most recent ATTOM record's
// raw response + a compact "shape" of it for field-mapping. Never returns the key.
export async function GET() {
  try {
    await requireRole("ADMIN");
    const latestAttomRecord = await prisma.propertyRecord.findFirst({
      where: { source: "attom" },
      orderBy: { fetchedAt: "desc" },
    });
    const raw = (latestAttomRecord?.raw ?? null) as Record<string, unknown> | null;
    const rawShape = raw
      ? {
          topKeys: Object.keys(raw),
          summary: shape(raw.summary),
          building: shape(raw.building),
          buildingSize: shape((raw.building as Record<string, unknown>)?.size),
          assessment: shape(raw.assessment),
          assessmentAssessed: shape((raw.assessment as Record<string, unknown>)?.assessed),
          assessmentMarket: shape((raw.assessment as Record<string, unknown>)?.market),
          sale: shape(raw.sale),
          avm: shape(raw.avm),
          lot: shape(raw.lot),
        }
      : null;
    return json({ ...providerDiagnostics(), rawShape, latestAttomRecord });
  } catch (err) {
    return handleError(err);
  }
}
