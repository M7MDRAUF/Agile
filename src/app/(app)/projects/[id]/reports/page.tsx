import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { projectHealth, cycleTimeDays, countBy } from "@/lib/domain/metrics";
import { humanize } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { HealthBadge } from "@/components/status-badge";
import { SimpleBarChart, DonutChart } from "@/components/charts";
import { Activity, Timer, ListChecks, Bug } from "lucide-react";

export const metadata: Metadata = { title: "Project Reports" };

const TYPE_COLORS: Record<string, string> = {
  epic: "#8b5cf6",
  story: "#16a34a",
  task: "#0ea5e9",
  bug: "#dc2626",
  subtask: "#64748b",
};

export default async function ProjectReportsPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("report.view");
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      workItems: {
        select: { status: true, type: true, priority: true, createdAt: true, completedAt: true },
      },
    },
  });
  if (!project) notFound();

  const openBlockers = await prisma.blocker.count({
    where: { status: "open", workItem: { projectId: id } },
  });

  const health = projectHealth({ items: project.workItems, openBlockers });
  const cycleTime = cycleTimeDays(project.workItems);
  const done = project.workItems.filter((w) => w.status === "done").length;
  const bugs = project.workItems.filter((w) => w.type === "bug").length;

  const byStatus = countBy(project.workItems, (w) => w.status);
  const statusData = Object.entries(byStatus).map(([name, value]) => ({
    name: humanize(name),
    value,
  }));
  const byType = countBy(project.workItems, (w) => w.type);
  const typeData = Object.entries(byType).map(([type, value]) => ({
    name: humanize(type),
    value,
    color: TYPE_COLORS[type] ?? "#64748b",
  }));

  return (
    <div>
      <PageHeader
        title={`${project.name} — Reports`}
        description={
          <span className="flex items-center gap-2">
            Health score: {health.score}/100 <HealthBadge health={health.health} />
          </span>
        }
        actions={
          <Link href={`/projects/${project.id}`} className="text-sm text-primary hover:underline">
            Back to project
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Health"
          value={`${health.score}`}
          icon={Activity}
          hint={health.health.replace(/_/g, " ")}
        />
        <StatCard
          label="Completed"
          value={done}
          icon={ListChecks}
          hint={`of ${project.workItems.length}`}
        />
        <StatCard label="Cycle Time" value={`${cycleTime}d`} icon={Timer} />
        <StatCard label="Bugs" value={bugs} icon={Bug} tone="danger" />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Health Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {health.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Items by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={statusData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Items by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={typeData} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
