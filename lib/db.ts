import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 * In development, we store the client on globalThis to survive HMR (hot module replacement).
 * In production, a new client is created per cold start.
 *
 * WHY: Next.js re-evaluates modules on every HMR cycle in dev. Without this,
 * we'd exhaust the Neon connection pool within minutes.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
