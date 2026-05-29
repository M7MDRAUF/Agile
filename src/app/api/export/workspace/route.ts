import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/domain/permissions";
import { assertSameOrigin } from "@/lib/http/origin";

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  return lines.join("\n");
}

/**
 * Download a workspace work-item report (admin/manager only). Supports
 * ?format=csv (default) or ?format=json.
 */
export async function GET(request: Request) {
  // SEC-007: reject browser-originated cross-origin downloads.
  const blocked = assertSameOrigin(request);
  if (blocked) return blocked;

  const user = await requireUser();
  if (!can(user.role, "report.view") || !can(user.role, "project.view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  // Workspace-wide export is limited to workspace managers.
  if (!can(user.role, "settings.manage_workspace")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // PERF-002: bound the export to prevent OOM on large workspaces.
  // 50k rows ≈ ~20 MB CSV — generous for legitimate exports, but caps
  // pathological "download everything" requests. Clients can request
  // ?limit=N (1..50000) for smaller chunks.
  const EXPORT_HARD_CAP = 50_000;
  const url = new URL(request.url);
  const limitParam = url.searchParams.get("limit");
  const parsedLimit = limitParam ? Math.floor(Number(limitParam)) : EXPORT_HARD_CAP;
  const take =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, EXPORT_HARD_CAP)
      : EXPORT_HARD_CAP;

  const items = await prisma.workItem.findMany({
    select: {
      key: true,
      title: true,
      type: true,
      status: true,
      priority: true,
      storyPoints: true,
      project: { select: { key: true } },
      assignee: { select: { name: true } },
      createdAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: "asc" },
    take,
  });

  const rows = items.map((i) => ({
    key: i.key,
    title: i.title,
    type: i.type,
    status: i.status,
    priority: i.priority,
    storyPoints: i.storyPoints ?? "",
    project: i.project.key,
    assignee: i.assignee?.name ?? "",
    createdAt: i.createdAt.toISOString(),
    completedAt: i.completedAt?.toISOString() ?? "",
  }));

  const format = url.searchParams.get("format");
  const truncated = items.length >= take;
  const truncationHeader: Record<string, string> = truncated
    ? { "X-Export-Truncated": `true; cap=${take}` }
    : {};
  if (format === "json") {
    return new NextResponse(
      JSON.stringify(
        { exportedAt: new Date().toISOString(), truncated, count: rows.length, rows },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="agileforge-workspace-report.json"`,
          ...truncationHeader,
        },
      },
    );
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="agileforge-workspace-report.csv"`,
      ...truncationHeader,
    },
  });
}
