import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/status-badge";
import { WorkItemTypeIcon } from "@/components/work-item/type-icon";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Backlog" };

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export default async function BacklogPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;

  const projects = await prisma.project.findMany({
    orderBy: { key: "asc" },
    select: { id: true, key: true, name: true },
  });
  const projectId = sp.project ?? projects[0]?.id;

  const items = projectId
    ? await prisma.workItem.findMany({
        where: { projectId, sprintId: null, status: { in: ["backlog", "ready"] } },
        include: {
          assignee: { select: { name: true, avatarColor: true } },
          epic: { select: { title: true, color: true } },
        },
      })
    : [];

  const sorted = [...items].sort(
    (a, b) =>
      (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
      (b.storyPoints ?? 0) - (a.storyPoints ?? 0),
  );

  const totalPoints = sorted.reduce((s, i) => s + (i.storyPoints ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Backlog"
        description="Unscheduled, prioritized work waiting to be pulled into a sprint."
        actions={
          <form method="GET" className="flex items-center gap-2">
            <Select name="project" defaultValue={projectId} className="w-48">
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.key} · {p.name}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">
              View
            </Button>
          </form>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>
            {sorted.length} items · {totalPoints} points
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.length === 0 ? (
            <EmptyState
              title="Backlog is empty"
              description="Create work items or move them out of sprints."
            />
          ) : (
            sorted.map((i, idx) => (
              <div
                key={i.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">
                  {idx + 1}
                </span>
                <WorkItemTypeIcon type={i.type} />
                <Link href={`/work-items/${i.id}`} className="min-w-0 flex-1 hover:underline">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  {i.epic ? (
                    <span className="text-xs text-muted-foreground">{i.epic.title}</span>
                  ) : null}
                </Link>
                <PriorityBadge priority={i.priority} />
                <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                  {i.storyPoints ?? "—"} pt
                </span>
                {i.assignee ? (
                  <Avatar name={i.assignee.name} color={i.assignee.avatarColor} size={24} />
                ) : (
                  <span className="w-6" />
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
