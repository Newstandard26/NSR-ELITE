import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { handleError, json } from "@/lib/api";
import { getValidInvite } from "@/lib/invite";

export const dynamic = "force-dynamic";

// GET /api/auth/set-password?token=… — validate an invite token (public).
export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token") ?? "";
    const invite = await getValidInvite(token);
    if (!invite) return json({ valid: false }, 410);
    return json({ valid: true, name: invite.user.name, email: invite.user.email });
  } catch (err) {
    return handleError(err);
  }
}

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// POST /api/auth/set-password — set a password via a valid invite token (public).
export async function POST(req: Request) {
  try {
    const { token, password } = schema.parse(await req.json());
    const invite = await getValidInvite(token);
    if (!invite) return json({ error: "This invite link is invalid or has expired." }, 410);

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: invite.userId },
        data: { passwordHash, isActive: true },
      }),
      prisma.inviteToken.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
    ]);
    return json({ ok: true, email: invite.user.email });
  } catch (err) {
    return handleError(err);
  }
}
