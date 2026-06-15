import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/imports — import history.
export async function GET() {
  try {
    await requireRole("MANAGER", "ADMIN");
    const rows = await prisma.importLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return json(rows);
  } catch (err) {
    return handleError(err);
  }
}
