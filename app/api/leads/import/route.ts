import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { geocodeAddress, composeAddress } from "@/lib/geocode";
import { logActivity } from "@/lib/activity";

const rowSchema = z.object({
  ownerName: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional(),
});

const schema = z.object({
  filename: z.string().optional(),
  leads: z.array(rowSchema).min(1),
  defaultDispositionId: z.string().optional(),
  defaultRepId: z.string().optional(),
  duplicateHandling: z.enum(["skip", "update"]).default("skip"),
});

// POST /api/leads/import — bulk import mapped rows (managers/admins).
export async function POST(req: Request) {
  try {
    const user = await requireRole("MANAGER", "ADMIN");
    const body = schema.parse(await req.json());

    const defaultStatus = body.defaultDispositionId
      ? { id: body.defaultDispositionId }
      : await prisma.dispositionStatus.findFirst({ where: { isDefault: true }, select: { id: true } });

    const results = { imported: 0, updated: 0, skipped: 0, geocodeFailed: 0, errors: [] as string[] };

    for (const row of body.leads) {
      if (!row.address || !row.city || !row.state || !row.zip) {
        results.skipped++;
        continue;
      }
      try {
        // Duplicate detection by address + zip.
        const existing = await prisma.lead.findFirst({
          where: { address: row.address, zip: row.zip },
        });
        if (existing) {
          if (body.duplicateHandling === "skip") {
            results.skipped++;
            continue;
          }
          await prisma.lead.update({
            where: { id: existing.id },
            data: {
              ownerName: row.ownerName || existing.ownerName,
              phone: row.phone || existing.phone,
              email: row.email || existing.email,
            },
          });
          results.updated++;
          continue;
        }

        const g = await geocodeAddress(composeAddress(row as Required<typeof row>));
        if (!g.ok) results.geocodeFailed++;
        const lead = await prisma.lead.create({
          data: {
            address: row.address, city: row.city, state: row.state, zip: row.zip,
            lat: g.lat, lng: g.lng,
            ownerName: row.ownerName || undefined,
            phone: row.phone || undefined,
            email: row.email || undefined,
            repId: body.defaultRepId || undefined,
            dispositionStatusId: defaultStatus?.id,
            dispositionAt: defaultStatus ? new Date() : undefined,
          },
        });
        await logActivity(lead.id, "lead_imported", "Imported from CSV", user.name || "Import");
        if (row.notes) {
          await prisma.note.create({ data: { leadId: lead.id, content: row.notes, author: user.name || "Import" } });
        }
        results.imported++;
      } catch (e) {
        results.errors.push(`${row.address}: ${(e as Error).message}`);
      }
    }

    await prisma.importLog.create({
      data: {
        filename: body.filename || "import.csv",
        total: body.leads.length,
        success: results.imported + results.updated,
        errors: results.errors.length + results.skipped,
        importedBy: user.name,
      },
    });

    return json(results);
  } catch (err) {
    return handleError(err);
  }
}
