import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/users — list users for management (managers + admins).
export async function GET() {
  try {
    await requireRole("MANAGER", "ADMIN");
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        acculynxId: true,
      },
    });
    return json(users);
  } catch (err) {
    return handleError(err);
  }
}
