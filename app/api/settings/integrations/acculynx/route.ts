import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { getIntegrationSettings, updateIntegrationSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

// GET /api/settings/integrations/acculynx
export async function GET() {
  try {
    await requireRole("MANAGER", "ADMIN");
    const settings = await getIntegrationSettings();
    return json({ ...settings, hasApiKey: !!process.env.ACCULYNX_API_KEY });
  } catch (err) {
    return handleError(err);
  }
}

const patchSchema = z.object({
  acculynxLeadSourceId: z.string().nullable().optional(),
  triggerStatusIds: z.array(z.string()).optional(),
  milestoneMap: z.record(z.string()).optional(),
});

// PATCH /api/settings/integrations/acculynx
export async function PATCH(req: Request) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const body = patchSchema.parse(await req.json());
    await updateIntegrationSettings(body);
    return json(await getIntegrationSettings());
  } catch (err) {
    return handleError(err);
  }
}
