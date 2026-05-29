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

  const format = new URL(request.url).searchParams.get("format");
  if (format === "json") {
    return new NextResponse(
      JSON.stringify({ exportedAt: new Date().toISOString(), rows }, null, 2),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="agileforge-workspace-report.json"`,
        },
      },
    );
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="agileforge-workspace-report.csv"`,
    },
  });
}
