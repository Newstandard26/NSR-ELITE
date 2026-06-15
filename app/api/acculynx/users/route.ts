import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { acculynx } from "@/lib/acculynx";

export const dynamic = "force-dynamic";

// GET /api/acculynx/users — AccuLynx users for rep mapping.
export async function GET() {
  try {
    await requireRole("MANAGER", "ADMIN");
    const users = await acculynx().getUsers();
    return json(
      users.map((u) => ({
        id: u.id,
        name: u.fullName || [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
        email: u.email,
      })),
    );
  } catch (err) {
    return handleError(err);
  }
}
