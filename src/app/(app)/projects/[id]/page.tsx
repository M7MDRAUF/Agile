import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { isDone, countBy } from "@/lib/domain/metrics";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { HealthBadge, StatusBadge, SprintStatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { humanize } from "@/lib/utils";
import { Layers, ListChecks, Bug, ShieldAlert } from "lucide-react";

export const metadata: Metadata = { title: "Project" };

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: true,
      team: { include: { members: { include: { user: true } } } },
      epics: { include: { _count: { select: { workItems: true } } } },
      sprints: {
        orderBy: { startDate: "desc" },
        include: { _count: { select: { workItems: true } } },
      },
      risks: { orderBy: { createdAt: "desc" } },
      workItems: { select: { status: true, type: true } },
    },
  });
  if (!project) notFound();

  const total = project.workItems.length;
  const done = project.workItems.filter((w) => isDone(w.status)).length;
  const bugs = project.workItems.filter((w) => w.type === "bug").length;
  const blocked = project.workItems.filter((w) => w.status === "blocked").length;
  const byStatus = countBy(project.workItems, (w) => w.status);

  return (
    <div>
      <PageHeader
        title={project.name}
        description={
          <span className="flex items-center gap-2">
            <Badge variant="muted">{project.key}</Badge>
            <HealthBadge health={project.health} />
            <span>· {humanize(project.status)}</span>
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Link
              href={`/projects/${project.id}/roadmap`}
              className="text-sm text-primary hover:underline"
            >
              Roadmap
            </Link>
            <Link
              href={`/projects/${project.id}/reports`}
              className="text-sm text-primary hover:underline"
            >
              Reports
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Completion"
          value={`${total ? Math.round((done / total) * 100) : 0}%`}
          icon={ListChecks}
          hint={`${done}/${total} items`}
        />
        <StatCard label="Epics" value={project.epics.length} icon={Layers} />
        <StatCard label="Open Bugs" value={bugs} icon={Bug} tone="danger" />
        <StatCard label="Blocked" value={blocked} icon={ShieldAlert} tone="warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Epics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {project.epics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No epics.</p>
              ) : (
                project.epics.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <span className="size-3 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="flex-1 text-sm font-medium">{e.title}</span>
                    <StatusBadge status={e.status} />
                    <span className="text-xs text-muted-foreground">
                      {e._count.workItems} items
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sprints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {project.sprints.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sprints.</p>
              ) : (
                project.sprints.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sprints/${s.id}`}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-accent"
                  >
                    <span className="flex-1 text-sm font-medium">{s.name}</span>
                    <SprintStatusBadge status={s.status} />
                    <span className="text-xs text-muted-foreground">
                      {s._count.workItems} items
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {project.risks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No risks logged.</p>
              ) : (
                project.risks.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <Badge
                      variant={
                        r.severity === "high"
                          ? "danger"
                          : r.severity === "medium"
                            ? "warning"
                            : "muted"
                      }
                    >
                      {humanize(r.severity)}
                    </Badge>
                    <span className="flex-1 text-sm">{r.title}</span>
                    <Badge variant={r.status === "open" ? "info" : "success"}>
                      {humanize(r.status)}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner</span>
                <span className="flex items-center gap-2">
                  {project.owner ? (
                    <>
                      <Avatar
                        name={project.owner.name}
                        color={project.owner.avatarColor}
                        size={22}
                      />
                      {project.owner.name}
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Team</span>
                <span>{project.team?.name ?? "—"}</span>
              </div>
              {project.startDate ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Start</span>
                  <span>{format(new Date(project.startDate), "MMM d, yyyy")}</span>
                </div>
              ) : null}
              {project.targetDate ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target</span>
                  <span>{format(new Date(project.targetDate), "MMM d, yyyy")}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {Object.entries(byStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <StatusBadge status={status} />
                  <span className="tabular-nums">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {project.team ? (
            <Card>
              <CardHeader>
                <CardTitle>Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {project.team.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm">
                    <Avatar name={m.user.name} color={m.user.avatarColor} size={24} />
                    <span className="flex-1">{m.user.name}</span>
                    <span className="text-xs text-muted-foreground">{humanize(m.user.role)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
