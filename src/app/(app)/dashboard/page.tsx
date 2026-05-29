import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Bug,
  CalendarClock,
  Flag,
  ListChecks,
  TrendingUp,
  Users,
} from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { sprintProgress, velocity, countBy } from "@/lib/domain/metrics";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HealthBadge } from "@/components/status-badge";
import { VelocityChart } from "@/components/charts";
import { ROLE_LABELS } from "@/lib/domain/constants";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  const [
    activeSprints,
    myOpenTasks,
    openBlockers,
    overdueCount,
    openBugs,
    projects,
    completedSprints,
    recentActivity,
    upcomingSprints,
  ] = await Promise.all([
    prisma.sprint.findMany({
      where: { status: "active" },
      include: { workItems: true, project: true },
    }),
    prisma.workItem.count({
      where: { assigneeId: user.id, status: { notIn: ["done", "canceled"] } },
    }),
    prisma.blocker.count({ where: { status: "open" } }),
    prisma.workItem.count({
      where: { dueDate: { lt: new Date() }, status: { notIn: ["done", "canceled"] } },
    }),
    prisma.workItem.count({ where: { type: "bug", status: { notIn: ["done", "canceled"] } } }),
    prisma.project.findMany({
      include: { _count: { select: { workItems: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.sprint.findMany({
      where: { status: "completed" },
      include: { workItems: true },
      orderBy: { endDate: "asc" },
      take: 6,
    }),
    prisma.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: true, workItem: { select: { key: true, title: true } } },
    }),
    prisma.sprint.findMany({
      where: { status: { in: ["active", "planned"] }, startDate: { not: null } },
      orderBy: { startDate: "asc" },
      take: 5,
      include: { project: { select: { key: true } } },
    }),
  ]);

  const [workloadItems, activeUsers] = await Promise.all([
    prisma.workItem.findMany({
      where: { assigneeId: { not: null }, status: { notIn: ["done", "canceled"] } },
      select: { assigneeId: true },
    }),
    prisma.user.findMany({
      where: { status: "active" },
      select: { id: true, name: true, avatarColor: true },
    }),
  ]);
  const userById = new Map(activeUsers.map((u) => [u.id, u]));
  const workloadCounts = countBy(
    workloadItems.filter((i) => i.assigneeId),
    (i) => i.assigneeId as string,
  );
  const teamWorkload = Object.entries(workloadCounts)
    .map(([uid, count]) => ({ user: userById.get(uid), count }))
    .filter((w) => w.user)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxWorkload = teamWorkload[0]?.count ?? 1;

  const allActiveItems = activeSprints.flatMap((s) => s.workItems);
  const activeProgress = sprintProgress(allActiveItems);

  const velocityData = completedSprints.map((s) => {
    const p = sprintProgress(s.workItems);
    return {
      sprint: s.name.replace(/^.* /, "S"),
      committed: p.totalPoints,
      completed: p.completedPoints,
    };
  });
  const avgVelocity = velocity(
    completedSprints.map((s) => sprintProgress(s.workItems).completedPoints),
  );

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.name.split(" ")[0]}`}
        description={`${ROLE_LABELS[user.role]} · Here is the delivery picture across NovaCore today.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="My Open Tasks" value={myOpenTasks} icon={ListChecks} />
        <StatCard
          label="Open Blockers"
          value={openBlockers}
          icon={Flag}
          tone={openBlockers ? "danger" : "success"}
        />
        <StatCard
          label="Overdue Work"
          value={overdueCount}
          icon={AlertTriangle}
          tone={overdueCount ? "warning" : "success"}
        />
        <StatCard
          label="Open Bugs"
          value={openBugs}
          icon={Bug}
          tone={openBugs ? "warning" : "success"}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Velocity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {velocityData.length ? (
              <VelocityChart data={velocityData} />
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No completed sprints yet.
              </p>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              Average completed velocity:{" "}
              <span className="font-semibold text-foreground">{avgVelocity} pts</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Sprint Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-semibold">{activeProgress.percentComplete}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${activeProgress.percentComplete}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {activeProgress.completedPoints} / {activeProgress.totalPoints} story points ·{" "}
                {activeProgress.completedItems}/{activeProgress.totalItems} items
              </p>
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Upcoming ceremonies
              </p>
              {upcomingSprints.length ? (
                upcomingSprints.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CalendarClock className="size-4 text-muted-foreground" />
                      {s.project.key} {s.name.replace(/^.* /, "Sprint ")}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.startDate ? new Date(s.startDate).toLocaleDateString() : "—"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No upcoming sprints.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Project Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 transition-colors hover:bg-muted"
              >
                <span className="flex items-center gap-3">
                  <Badge variant="outline">{p.key}</Badge>
                  <span className="text-sm font-medium">{p.name}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{p._count.workItems} items</span>
                  <HealthBadge health={p.health} />
                </span>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="size-4" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <Avatar name={a.actor?.name ?? "System"} color={a.actor?.avatarColor} size={28} />
                <div className="min-w-0 text-sm">
                  <p className="leading-tight">
                    <span className="font-medium">{a.actor?.name ?? "System"}</span>{" "}
                    <span className="text-muted-foreground">{a.message}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.workItem.key} · {formatDistanceToNow(a.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" /> Team Workload
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {teamWorkload.length ? (
              teamWorkload.map(({ user: u, count }) => (
                <div key={u!.id} className="flex items-center gap-3">
                  <Avatar name={u!.name} color={u!.avatarColor} size={28} />
                  <span className="flex-1 truncate text-sm">{u!.name}</span>
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((count / maxWorkload) * 100)}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No open assignments.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
