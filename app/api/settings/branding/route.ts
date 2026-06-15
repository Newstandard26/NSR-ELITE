import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

export const dynamic = "force-dynamic";

const SINGLETON = "default";

// GET /api/settings/branding — readable by any authed user (applied app-wide).
export async function GET() {
  try {
    await requireUser();
    const row = await prisma.workspaceSettings.upsert({
      where: { id: SINGLETON },
      update: {},
      create: { id: SINGLETON },
    });
    return json({ brandColor: row.brandColor, logoUrl: row.logoUrl });
  } catch (err) {
    return handleError(err);
  }
}

const patchSchema = z.object({
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
});

// PATCH /api/settings/branding — admin only.
export async function PATCH(req: Request) {
  try {
    await requireRole("ADMIN", "MANAGER");
    const body = patchSchema.parse(await req.json());
    const row = await prisma.workspaceSettings.upsert({
      where: { id: SINGLETON },
      create: { id: SINGLETON, ...body },
      update: body,
    });
    return json({ brandColor: row.brandColor, logoUrl: row.logoUrl });
  } catch (err) {
    return handleError(err);
  }
}
