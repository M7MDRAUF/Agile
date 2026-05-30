import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { sprintProgress, burndown, countBy } from "@/lib/domain/metrics";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { SprintStatusBadge } from "@/components/status-badge";
import { BurndownChart } from "@/components/charts";
import { Board, type BoardItem } from "@/components/board/Board";
import { SprintControls } from "@/components/sprint/SprintControls";
import { AddSprintItems, type SprintCandidate } from "@/components/sprint/add-sprint-items";
import { can } from "@/lib/domain/permissions";
import { Target, ListChecks, Zap, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Sprint" };

export default async function SprintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("sprint.view");
  const { id } = await params;

  const sprint = await prisma.sprint.findUnique({
    where: { id },
    include: {
      project: { select: { key: true, name: true } },
      workItems: { include: { assignee: { select: { name: true, avatarColor: true } } } },
    },
  });
  if (!sprint) notFound();

  const progress = sprintProgress(sprint.workItems);
  const start = sprint.startDate ?? sprint.createdAt;
  const end = sprint.endDate ?? new Date(start.getTime() + 14 * 86_400_000);
  const completions = sprint.workItems
    .filter((w) => w.completedAt && w.storyPoints)
    .map((w) => ({ date: w.completedAt as Date, points: w.storyPoints ?? 0 }));
  const burndownData = burndown(progress.totalPoints, start, end, completions);
  const byStatus = countBy(sprint.workItems, (w) => w.status);

  const canManage = can(user.role, "sprint.manage");
  // Candidate items: same project, not assigned to any sprint, still in the
  // backlog/ready columns. Only loaded when the viewer can manage the sprint.
  const candidates: SprintCandidate[] = canManage
    ? await prisma.workItem.findMany({
        where: {
          projectId: sprint.projectId,
          sprintId: null,
          status: { in: ["backlog", "ready"] },
        },
        orderBy: [{ rank: "asc" }, { priority: "asc" }],
        take: 100,
        select: {
          id: true,
          key: true,
          title: true,
          type: true,
          priority: true,
          storyPoints: true,
        },
      })
    : [];

  const items: BoardItem[] = sprint.workItems.map((w) => ({
    id: w.id,
    key: w.key,
    title: w.title,
    type: w.type,
    status: w.status,
    priority: w.priority,
    storyPoints: w.storyPoints,
    assignee: w.assignee,
  }));

  return (
    <div>
      <PageHeader
        title={sprint.name}
        description={
          <span className="flex items-center gap-2">
            {sprint.project.name}
            <SprintStatusBadge status={sprint.status} />
            {sprint.startDate && sprint.endDate ? (
              <span>
                · {format(new Date(sprint.startDate), "MMM d")} –{" "}
                {format(new Date(sprint.endDate), "MMM d, yyyy")}
              </span>
            ) : null}
          </span>
        }
        actions={
          can(user.role, "sprint.manage") ? (
            <SprintControls sprintId={sprint.id} status={sprint.status} />
          ) : undefined
        }
      />

      {sprint.goal ? (
        <Card className="mb-6">
          <CardContent className="py-4">
            <p className="text-sm">
              <span className="font-semibold">Goal: </span>
              {sprint.goal}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Progress" value={`${progress.percentComplete}%`} icon={Target} />
        <StatCard
          label="Items"
          value={`${progress.completedItems}/${progress.totalItems}`}
          icon={ListChecks}
        />
        <StatCard
          label="Points"
          value={`${progress.completedPoints}/${progress.totalPoints}`}
          icon={Zap}
        />
        <StatCard label="Capacity" value={sprint.capacity ?? "—"} icon={CheckCircle2} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Burndown</CardTitle>
          </CardHeader>
          <CardContent>
            <BurndownChart data={burndownData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <span className="capitalize text-muted-foreground">
                  {status.replace(/_/g, " ")}
                </span>
                <span className="tabular-nums">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Sprint Board</h2>
        {canManage ? <AddSprintItems sprintId={sprint.id} candidates={candidates} /> : null}
      </div>
      <Board items={items} />
    </div>
  );
}
