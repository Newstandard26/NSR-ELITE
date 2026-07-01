import { PrismaClient } from "@prisma/client";

// Prisma client singleton — avoids exhausting connections during dev HMR.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Serverless Postgres (Neon) occasionally hands back a dropped connection
// ("Error { kind: Closed }" / P1001 / P1017), which makes one-shot queries fail
// intermittently — most painfully during login. Retry only those transient
// connection errors on a fresh attempt; never retry real query/logic errors.
export async function withDbRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = String((e as Error)?.message ?? "");
      const transient = /kind:\s*Closed|Closed\b|Connection|P1001|P1017|ECONNRESET|ETIMEDOUT|terminating connection|server has closed/i.test(msg);
      if (!transient || attempt === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
    }
  }
  throw lastErr;
}

export default prisma;
