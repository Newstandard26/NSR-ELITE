import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/email";

// Invite links are valid for 72 hours.
const EXPIRY_HOURS = 72;

function appBaseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ||
    process.env.APP_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  ).replace(/\/$/, "");
}

// Creates a fresh single-use invite token for a user, invalidating any prior
// unused ones, and returns the set-password URL.
export async function createInviteLink(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.inviteToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.inviteToken.create({
    data: { token, userId, expiresAt: new Date(Date.now() + EXPIRY_HOURS * 3600_000) },
  });
  return `${appBaseUrl()}/set-password?token=${token}`;
}

function inviteEmailHtml(name: string, link: string): string {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#18181b">
    <h2 style="margin:0 0 4px">Welcome to NSR Elite</h2>
    <p style="color:#52525b;margin:0 0 20px">Field canvassing for New Standard Restoration</p>
    <p>Hi ${name || "there"},</p>
    <p>You've been invited to NSR Elite. Click below to set your password and sign in.</p>
    <p style="margin:28px 0">
      <a href="${link}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">
        Set your password
      </a>
    </p>
    <p style="color:#71717a;font-size:13px">This link expires in ${EXPIRY_HOURS} hours. If the button doesn't work, paste this into your browser:</p>
    <p style="color:#2563eb;font-size:13px;word-break:break-all">${link}</p>
    <p style="color:#a1a1aa;font-size:12px;margin-top:24px">If you weren't expecting this, you can ignore this email.</p>
  </div>`;
}

// Generates an invite link and emails it. Returns the link plus whether the
// email actually sent (false = mocked because SMTP isn't configured).
export async function sendInvite(userId: string): Promise<{ link: string; mocked: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  const link = await createInviteLink(userId);
  const { mocked } = await sendMail({
    to: user.email,
    subject: "Your NSR Elite invite — set your password",
    html: inviteEmailHtml(user.name, link),
    text: `Welcome to NSR Elite. Set your password: ${link} (expires in ${EXPIRY_HOURS} hours).`,
  });
  return { link, mocked };
}

// Validates a token for the set-password page. Returns the target user, or null.
export async function getValidInvite(token: string) {
  const invite = await prisma.inviteToken.findUnique({
    where: { token },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) return null;
  return invite;
}
