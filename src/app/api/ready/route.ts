import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// OPS-002: readiness probe. Confirms the DB is reachable with a trivial query.
// Returns 503 when the dependency is down so the orchestrator stops routing
// traffic to this instance.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready" });
  } catch (err) {
    return NextResponse.json(
      {
        status: "not_ready",
        error: err instanceof Error ? err.message : "unknown",
      },
      { status: 503 },
    );
  }
}
