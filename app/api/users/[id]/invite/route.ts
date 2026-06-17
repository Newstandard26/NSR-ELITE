import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { sendInvite } from "@/lib/invite";

export const dynamic = "force-dynamic";

// POST /api/users/[id]/invite — email a set-password invite link (manager/admin).
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const { link, mocked } = await sendInvite(params.id);
    // When SMTP isn't configured the email is mocked; return the link so the
    // admin can still copy/share it manually.
    return json({ sent: !mocked, mocked, link: mocked ? link : undefined });
  } catch (err) {
    return handleError(err);
  }
}
