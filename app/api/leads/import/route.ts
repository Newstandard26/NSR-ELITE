import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { geocodeAddress, composeAddress } from "@/lib/geocode";
import { logActivity } from "@/lib/activity";

interface CsvRow {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  email?: string;
  notes?: string;
  [key: string]: string | undefined;
}

// POST /api/leads/import — bulk CSV import. Accepts multipart file or raw CSV text.
// Geocodes each row; rows that fail geocoding still import (flagged, lat/lng = 0).
export async function POST(req: Request) {
  try {
    const user = await requireRole("MANAGER", "ADMIN");

    let csvText: string;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return json({ error: "No file provided" }, 400);
      csvText = await file.text();
    } else {
      const body = (await req.json()) as { csv?: string };
      if (!body.csv) return json({ error: "No csv provided" }, 400);
      csvText = body.csv;
    }

    const parsed = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
    });

    const defaultStatus = await prisma.dispositionStatus.findFirst({ where: { isDefault: true } });

    const results = { imported: 0, geocodeFailed: 0, skipped: 0, errors: [] as string[] };

    for (const row of parsed.data) {
      if (!row.address || !row.city || !row.state || !row.zip) {
        results.skipped++;
        continue;
      }
      try {
        const g = await geocodeAddress(composeAddress(row as Required<CsvRow>));
        if (!g.ok) results.geocodeFailed++;
        const lead = await prisma.lead.create({
          data: {
            address: row.address,
            city: row.city,
            state: row.state,
            zip: row.zip,
            lat: g.lat,
            lng: g.lng,
            ownerName: row.name || undefined,
            phone: row.phone || undefined,
            email: row.email || undefined,
            dispositionStatusId: defaultStatus?.id,
            dispositionAt: defaultStatus ? new Date() : undefined,
          },
        });
        await logActivity(lead.id, "lead_imported", "Imported from CSV", user.name || "Import");
        if (row.notes) {
          await prisma.note.create({
            data: { leadId: lead.id, content: row.notes, author: user.name || "Import" },
          });
        }
        results.imported++;
      } catch (e) {
        results.errors.push(`${row.address}: ${(e as Error).message}`);
      }
    }

    return json(results);
  } catch (err) {
    return handleError(err);
  }
}
