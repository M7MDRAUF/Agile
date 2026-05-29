import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import {
  velocity,
  cycleTimeDays,
  leadTimeDays,
  countBy,
  blockerAgeDays,
} from "@/lib/domain/metrics";
import { humanize } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { VelocityChart, SimpleBarChart, DonutChart } from "@/components/charts";
import { Gauge, Timer, ShieldAlert, ListChecks, Hourglass } from "lucide-react";

export const metadata: Metadata = { title: "Reports" };

const PRIORITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#ea580c",
  medium: "#d97706",
  low: "#65a30d",
};

export default async function ReportsPage() {
  await requirePermission("report.view");

  const [completedSprints, allItems, openBlockers, users] = await Promise.all([
    prisma.sprint.findMany({
      where: { status: "completed" },
      orderBy: { startDate: "asc" },
      include: { workItems: { select: { status: true, storyPoints: true } } },
      take: 8,
    }),
    prisma.workItem.findMany({
      select: {
        id: true,
        status: true,
        type: true,
        priority: true,
        assigneeId: true,
        createdAt: true,
        completedAt: true,
      },
    }),
    prisma.blocker.findMany({ where: { status: "open" }, select: { createdAt: true } }),
    prisma.user.findMany({ where: { status: "active" }, select: { id: true, name: true } }),
  ]);

  // Derive a "started" marker from the first "in progress" status change so
  // cycle time can be measured from when work actually began (vs. lead time,
  // which is measured from creation).
  const startEvents = await prisma.activityLog.findMany({
    where: { type: "status_change", newValue: "in_progress" },
    select: { workItemId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const startedAtMap = new Map<string, Date>();
  for (const e of startEvents) {
    if (!startedAtMap.has(e.workItemId)) startedAtMap.set(e.workItemId, e.createdAt);
  }
  const itemsWithStart = allItems.map((i) => ({
    ...i,
    startedAt: startedAtMap.get(i.id) ?? null,
  }));

  const velocityData = completedSprints.map((s, idx) => ({
    sprint: `S${idx + 1}`,
    committed: s.workItems.reduce((sum, w) => sum + (w.storyPoints ?? 0), 0),
    completed: s.workItems
      .filter((w) => w.status === "done")
      .reduce((sum, w) => sum + (w.storyPoints ?? 0), 0),
  }));
  const avgVelocity = velocity(velocityData.map((v) => v.completed));
  const cycleTime = cycleTimeDays(itemsWithStart);
  const leadTime = leadTimeDays(itemsWithStart);

  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const workloadCounts = countBy(
    allItems.filter((i) => i.assigneeId && i.status !== "done" && i.status !== "canceled"),
    (i) => i.assigneeId as string,
  );
  const workloadData = Object.entries(workloadCounts)
    .map(([uid, value]) => ({ name: userMap.get(uid) ?? "Unknown", value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const bugs = allItems.filter(
    (i) => i.type === "bug" && i.status !== "done" && i.status !== "canceled",
  );
  const bugSeverity = countBy(bugs, (b) => b.priority ?? "medium");
  const bugData = Object.entries(bugSeverity).map(([priority, value]) => ({
    name: humanize(priority),
    value,
    color: PRIORITY_COLORS[priority] ?? "#64748b",
  }));

  const agingBuckets = { "0-2d": 0, "3-5d": 0, "6-10d": 0, ">10d": 0 };
  for (const b of openBlockers) {
    const age = blockerAgeDays(new Date(b.createdAt));
    if (age <= 2) agingBuckets["0-2d"]++;
    else if (age <= 5) agingBuckets["3-5d"]++;
    else if (age <= 10) agingBuckets["6-10d"]++;
    else agingBuckets[">10d"]++;
  }
  const agingData = Object.entries(agingBuckets).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <PageHeader
        title="Reports & Analytics"
        description="Delivery health, throughput and quality trends."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Avg Velocity"
          value={`${avgVelocity} pts`}
          icon={Gauge}
          hint="last sprints"
        />
        <StatCard label="Avg Cycle Time" value={`${cycleTime}d`} icon={Timer} hint="start → done" />
        <StatCard
          label="Avg Lead Time"
          value={`${leadTime}d`}
          icon={Hourglass}
          hint="created → done"
        />
        <StatCard label="Open Bugs" value={bugs.length} icon={ListChecks} tone="danger" />
        <StatCard
          label="Open Blockers"
          value={openBlockers.length}
          icon={ShieldAlert}
          tone="warning"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Velocity</CardTitle>
          </CardHeader>
          <CardContent>
            {velocityData.length ? (
              <VelocityChart data={velocityData} />
            ) : (
              <p className="text-sm text-muted-foreground">No completed sprints yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workload (open items per person)</CardTitle>
          </CardHeader>
          <CardContent>
            {workloadData.length ? (
              <SimpleBarChart data={workloadData} />
            ) : (
              <p className="text-sm text-muted-foreground">No open items.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Bugs by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {bugData.length ? (
              <DonutChart data={bugData} />
            ) : (
              <p className="text-sm text-muted-foreground">No open bugs.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blocker Aging</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={agingData} color="#dc2626" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
