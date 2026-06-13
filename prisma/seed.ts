import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// The 7 default disposition pins. Order controls the rep dropdown sequence.
const DEFAULT_DISPOSITIONS = [
  { label: "Not Visited", color: "#3B82F6", icon: "🔵", sortOrder: 1, isDefault: true },
  { label: "Not Home / No Answer", color: "#EAB308", icon: "🟡", sortOrder: 2 },
  { label: "Interested / Appointment Set", color: "#22C55E", icon: "🟢", sortOrder: 3 },
  { label: "Not Interested / Decline", color: "#EF4444", icon: "🔴", sortOrder: 4 },
  { label: "Do Not Knock", color: "#6B7280", icon: "⚪", sortOrder: 5 },
  { label: "Callback Requested", color: "#F97316", icon: "🟠", sortOrder: 6 },
  { label: "Converted / Job in AccuLynx", color: "#A855F7", icon: "🟣", sortOrder: 7 },
];

// NSR sales reps from the spec.
const REPS = ["Juan", "Aiden", "Skylar", "Branden", "Matt", "Andy", "Mitch", "Blake"];

async function main() {
  // --- Disposition statuses ---
  for (const d of DEFAULT_DISPOSITIONS) {
    const existing = await prisma.dispositionStatus.findFirst({ where: { label: d.label } });
    if (!existing) {
      await prisma.dispositionStatus.create({ data: d });
      console.log(`  + disposition: ${d.icon} ${d.label}`);
    }
  }

  // --- Seed users ---
  // Default dev password for all seeded accounts. Change in production.
  const defaultPassword = process.env.SEED_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // Admin
  await prisma.user.upsert({
    where: { email: "admin@newstandardrestoration.com" },
    update: {},
    create: {
      name: "NSR Admin",
      email: "admin@newstandardrestoration.com",
      role: Role.ADMIN,
      passwordHash,
    },
  });

  // Matt is in the rep list but is the primary operator — make Matt a manager.
  for (const name of REPS) {
    const email = `${name.toLowerCase()}@newstandardrestoration.com`;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        name,
        email,
        role: name === "Matt" ? Role.MANAGER : Role.REP,
        passwordHash,
      },
    });
    console.log(`  + user: ${name} <${email}>`);
  }

  console.log("\nSeed complete. Default password for all accounts:", defaultPassword);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
