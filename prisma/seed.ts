import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// The 7 default disposition pins. Order controls the rep dropdown sequence.
const DEFAULT_DISPOSITIONS = [
  { label: "Not Visited", abbreviation: "NV", color: "#3B82F6", icon: "🔵", pipelineStage: "Attempting Contact", sortOrder: 1, isDefault: true },
  { label: "Not Home / No Answer", abbreviation: "NH", color: "#EAB308", icon: "🟡", pipelineStage: "Attempting Contact", sortOrder: 2 },
  { label: "Interested / Appointment Set", abbreviation: "APPT", color: "#22C55E", icon: "🟢", pipelineStage: "Negotiating", sortOrder: 3 },
  { label: "Not Interested / Decline", abbreviation: "NI", color: "#EF4444", icon: "🔴", pipelineStage: "Lost – No Interest", sortOrder: 4 },
  { label: "Do Not Knock", abbreviation: "DNK", color: "#6B7280", icon: "⚪", pipelineStage: "Lost – Disqualified", sortOrder: 5 },
  { label: "Callback Requested", abbreviation: "CB", color: "#F97316", icon: "🟠", pipelineStage: "Attempting Contact", sortOrder: 6 },
  { label: "Converted / Job in AccuLynx", abbreviation: "WON", color: "#A855F7", icon: "🟣", pipelineStage: "Customer", sortOrder: 7 },
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
    } else {
      // Backfill abbreviation + pipeline stage on existing default pins.
      await prisma.dispositionStatus.update({
        where: { id: existing.id },
        data: { abbreviation: d.abbreviation, pipelineStage: d.pipelineStage },
      });
    }
  }

  // --- Seed users (only on a fresh database) ---
  // Skipping when users already exist avoids re-creating accounts whose email
  // was later changed in the app (which would otherwise duplicate them).
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(`\n${existingUsers} users already exist — skipping user seed.`);
    return;
  }

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
