import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // Supabase (and most managed Postgres) requires SSL outside local dev.
  // Respect explicit sslmode in the URL, otherwise enable SSL in production.
  const explicitSslMode = /[?&]sslmode=/.test(connectionString);
  const pool = new Pool({
    connectionString,
    ssl:
      explicitSslMode || process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : undefined,
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log:
      process.env.PRISMA_LOG_QUERIES === "1"
        ? [
            { emit: "event", level: "query" },
            { emit: "event", level: "warn" },
            { emit: "event", level: "error" },
          ]
        : process.env.NODE_ENV === "development"
          ? ["error", "warn"]
          : ["error"],
  });
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

/** @deprecated Use getPrisma() for lazy initialization */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return Reflect.get(getPrisma(), prop);
  },
});
