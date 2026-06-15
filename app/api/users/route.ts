import { z } from "zod";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { handleError, json } from "@/lib/api";

export const dynamic = "force-dynamic";

// GET /api/users — list users for management (managers + admins).
export async function GET() {
  try {
    await requireRole("MANAGER", "ADMIN");
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true, isActive: true, acculynxId: true },
    });
    return json(users);
  } catch (err) {
    return handleError(err);
  }
}

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.nativeEnum(Role).default(Role.REP),
  password: z.string().min(6, "Temporary password must be at least 6 characters"),
});

// POST /api/users — create a user with a temporary password (managers + admins).
export async function POST(req: Request) {
  try {
    await requireRole("MANAGER", "ADMIN");
    const body = createSchema.parse(await req.json());
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase(),
        role: body.role,
        passwordHash,
        isActive: true,
      },
      select: { id: true, name: true, email: true, role: true, isActive: true, acculynxId: true },
    });
    return json(user, 201);
  } catch (err) {
    return handleError(err);
  }
}
