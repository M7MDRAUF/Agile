import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 requires a driver adapter. We use better-sqlite3 for the local
// development database. The connection URL is taken from DATABASE_URL and is
// resolved relative to the project root (e.g. "file:./dev.db").
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// REL-007: Graceful shutdown. In containerised deployments (Docker, k8s) the
// runtime receives SIGTERM before SIGKILL; flushing the Prisma connection
// avoids dropped transactions and "connection terminated" log noise. Guard
// with a global flag so hot-reload in dev doesn't stack handlers.
const globalShutdown = globalThis as unknown as { __prismaShutdownRegistered?: boolean };
if (!globalShutdown.__prismaShutdownRegistered && typeof process !== "undefined") {
  globalShutdown.__prismaShutdownRegistered = true;
  const shutdown = async (signal: NodeJS.Signals) => {
    try {
      await prisma.$disconnect();
    } catch {
      // best-effort; process is exiting
    }
    process.kill(process.pid, signal);
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}
