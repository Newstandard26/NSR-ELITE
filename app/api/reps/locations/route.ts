import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

// GET /api/reps/locations — managers/admins get each rep's latest known position.
export async function GET() {
  try {
    await requireRole("MANAGER", "ADMIN");
    const reps = await prisma.user.findMany({
      where: { role: { in: ["REP", "MANAGER"] }, isActive: true },
      select: {
        id: true,
        name: true,
        locations: { orderBy: { timestamp: "desc" }, take: 1 },
      },
    });

    const positions = reps
      .filter((r) => r.locations.length > 0)
      .map((r) => ({
        repId: r.id,
        name: r.name,
        lat: r.locations[0].lat,
        lng: r.locations[0].lng,
        lastSeen: r.locations[0].timestamp,
      }));

    return json(positions);
  } catch (err) {
    return handleError(err);
  }
}
