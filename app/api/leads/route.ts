import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError, json } from "@/lib/api";
import { geocodeAddress, composeAddress } from "@/lib/geocode";
import { logActivity } from "@/lib/activity";

// Parse a query-string date, rejecting invalid or absurd out-of-range values
// (which would otherwise make Prisma throw and blank the leads/map view).
function safeDate(s: string | null): Date | undefined {
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  const y = d.getUTCFullYear();
  if (y < 2000 || y > 2100) return undefined;
  return d;
}

// GET /api/leads — filters: status, rep, territory, dateFrom, dateTo, search
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);

    const where: Prisma.LeadWhereInput = {};
    const status = searchParams.get("status");
    const rep = searchParams.get("rep");
    const territory = searchParams.get("territory");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const search = searchParams.get("search");

    if (status) where.dispositionStatusId = status;
    if (territory) where.territoryId = territory;
    // Reps only see their own leads unless a manager/admin asks for a specific rep.
    if (user.role === "REP") {
      where.repId = user.id;
    } else if (rep) {
      where.repId = rep;
    }
    // Parse dates defensively — a malformed filter (e.g. an out-of-range year)
    // otherwise crashes the whole leads query.
    const from = safeDate(dateFrom);
    const to = safeDate(dateTo);
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }
    if (search) {
      where.OR = [
        { ownerName: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { zip: { contains: search } },
      ];
    }

    // Sorting (whitelisted columns only).
    const sortable: Record<string, true> = {
      ownerName: true,
      city: true,
      createdAt: true,
      updatedAt: true,
      dispositionAt: true,
    };
    const sort = searchParams.get("sort") || "updatedAt";
    const order = searchParams.get("order") === "asc" ? "asc" : "desc";
    const orderBy: Prisma.LeadOrderByWithRelationInput = sortable[sort]
      ? { [sort]: order }
      : { updatedAt: "desc" };

    const include = {
      dispositionStatus: true,
      rep: { select: { id: true, name: true } },
      territory: { select: { id: true, name: true } },
      _count: { select: { notes: true, photos: true } },
    } as const;

    // Paginated response when ?page= is present; plain array otherwise (the
    // map relies on the array shape).
    const pageParam = searchParams.get("page");
    if (pageParam) {
      const page = Math.max(1, parseInt(pageParam, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
      const [items, total] = await Promise.all([
        prisma.lead.findMany({ where, orderBy, include, skip: (page - 1) * limit, take: limit }),
        prisma.lead.count({ where }),
      ]);
      return json({ items, total, page, limit });
    }

    const leads = await prisma.lead.findMany({ where, orderBy, include });
    return json(leads);
  } catch (err) {
    return handleError(err);
  }
}

const createSchema = z.object({
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  lat: z.number().optional(),
  lng: z.number().optional(),
  ownerName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  roofAge: z.number().int().optional(),
  insuranceCompany: z.string().optional(),
  dispositionStatusId: z.string().optional(),
  repId: z.string().optional(),
  territoryId: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

// POST /api/leads — create a lead. Geocodes if lat/lng absent.
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await req.json());

    let { lat, lng } = body;
    if (lat == null || lng == null) {
      const g = await geocodeAddress(composeAddress(body));
      lat = g.lat;
      lng = g.lng;
    }

    // Default disposition + default rep assignment.
    const dispositionStatusId =
      body.dispositionStatusId ??
      (await prisma.dispositionStatus.findFirst({ where: { isDefault: true } }))?.id;

    const lead = await prisma.lead.create({
      data: {
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        lat: lat ?? 0,
        lng: lng ?? 0,
        ownerName: body.ownerName,
        phone: body.phone,
        email: body.email || undefined,
        roofAge: body.roofAge,
        insuranceCompany: body.insuranceCompany,
        dispositionStatusId,
        dispositionAt: dispositionStatusId ? new Date() : undefined,
        // Default the lead to whoever entered it (any role); managers can pick a
        // different rep explicitly via the form, or reassign later.
        repId: body.repId ?? user.id,
        territoryId: body.territoryId,
      },
      include: { dispositionStatus: true, rep: { select: { id: true, name: true } } },
    });
    await logActivity(
      lead.id,
      "lead_created",
      `Lead created${lead.rep ? ` and assigned to ${lead.rep.name}` : ""}`,
      user.name,
    );
    if (body.notes) {
      await prisma.note.create({
        data: { leadId: lead.id, content: body.notes, author: user.name || "Rep", authorUserId: user.id },
      });
      await logActivity(lead.id, "note_added", body.notes, user.name);
    }
    return json(lead, 201);
  } catch (err) {
    return handleError(err);
  }
}
