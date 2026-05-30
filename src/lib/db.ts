import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 requires a driver adapter. We use better-sqlite3 for the local
// development database. The connection URL is taken from DATABASE_URL and is
// resolved relative to the project root (e.g. "file:./dev.db").
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * DEPLOY-002 / BUG-M28: select the Prisma driver adapter from the DATABASE_URL
 * scheme instead of hardcoding better-sqlite3. SQLite is the default (local dev
 * and the bundled demo DB). For a Postgres deployment, set a `postgres://` /
 * `postgresql://` URL and install the optional `@prisma/adapter-pg` package, and
 * switch the schema datasource `provider` to "postgresql". The pg adapter is
 * loaded lazily via a runtime require so SQLite-only installs don't need it and
 * the bundler doesn't try to resolve an absent dependency.
 */
function createAdapter(url: string) {
  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    let PrismaPgCtor: new (config: { connectionString: string }) => unknown;
    try {
      // Avoid static bundler resolution of an optional dependency.
      const runtimeRequire = eval("require") as NodeRequire;
      PrismaPgCtor = runtimeRequire("@prisma/adapter-pg").PrismaPg;
    } catch {
      throw new Error(
        "DATABASE_URL points at Postgres but '@prisma/adapter-pg' is not installed. " +
          "Run `npm install @prisma/adapter-pg pg` and set the schema provider to 'postgresql'.",
      );
    }
    return new PrismaPgCtor({ connectionString: url });
  }
  return new PrismaBetterSqlite3({ url });
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = createAdapter(url) as any;
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
