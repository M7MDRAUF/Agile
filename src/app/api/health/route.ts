import { NextResponse } from "next/server";

// OPS-002: liveness probe. Cheap, no DB hit, no auth — middleware allow-lists
// `/api/health`. Used by container orchestrators to decide if the process is up.
export const dynamic = "force-dynamic";

export function GET() {
  // PERF-006: probes must never be cached — a stale "ok" defeats the purpose.
  return NextResponse.json(
    { status: "ok", uptimeSeconds: process.uptime() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
