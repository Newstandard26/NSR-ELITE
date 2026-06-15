import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleError } from "@/lib/api";

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// GET /api/leads/export — CSV of the current filtered list.
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(req.url);
    const where: Prisma.LeadWhereInput = {};
    if (searchParams.get("status")) where.dispositionStatusId = searchParams.get("status")!;
    if (searchParams.get("territory")) where.territoryId = searchParams.get("territory")!;
    if (user.role === "REP") where.repId = user.id;
    else if (searchParams.get("rep")) where.repId = searchParams.get("rep")!;
    const search = searchParams.get("search");
    if (search) {
      where.OR = [
        { ownerName: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { dispositionStatus: true, rep: { select: { name: true } } },
    });

    const header = [
      "Homeowner", "Address", "City", "State", "Zip", "Phone", "Email",
      "Status", "Rep", "AccuLynx Job", "Created",
    ];
    const rows = leads.map((l) =>
      [
        l.ownerName, l.address, l.city, l.state, l.zip, l.phone, l.email,
        l.dispositionStatus?.label, l.rep?.name, l.acculynxJobId,
        l.createdAt.toISOString(),
      ].map(csvCell).join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nsr-leads-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
