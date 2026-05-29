import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { sprintProgress } from "@/lib/domain/metrics";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SprintStatusBadge, StatusBadge } from "@/components/status-badge";

export const metadata: Metadata = { title: "Roadmap" };

export default async function RoadmapPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      epics: {
        include: {
          _count: { select: { workItems: true } },
          workItems: { select: { status: true } },
        },
      },
      sprints: {
        orderBy: { startDate: "asc" },
        include: { workItems: { select: { status: true, storyPoints: true } } },
      },
    },
  });
  if (!project) notFound();

  return (
    <div>
      <PageHeader
        title={`${project.name} — Roadmap`}
        description="Epic delivery and sprint timeline."
        actions={
          <Link href={`/projects/${project.id}`} className="text-sm text-primary hover:underline">
            Back to project
          </Link>
        }
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Epics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {project.epics.length === 0 ? (
            <p className="text-sm text-muted-foreground">No epics.</p>
          ) : (
            project.epics.map((e) => {
              const done = e.workItems.filter((w) => w.status === "done").length;
              const pct = e.workItems.length ? Math.round((done / e.workItems.length) * 100) : 0;
              return (
                <div key={e.id}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="size-3 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="flex-1 text-sm font-medium">{e.title}</span>
                    <StatusBadge status={e.status} />
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: e.color }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sprint Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-4 border-l-2 border-border pl-6">
            {project.sprints.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sprints scheduled.</p>
            ) : (
              project.sprints.map((s) => {
                const progress = sprintProgress(s.workItems);
                return (
                  <div key={s.id} className="relative">
                    <span className="absolute -left-[31px] top-1 size-3 rounded-full bg-primary ring-4 ring-card" />
                    <Link
                      href={`/sprints/${s.id}`}
                      className="block rounded-md border border-border p-3 hover:bg-accent"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{s.name}</span>
                        <SprintStatusBadge status={s.status} />
                      </div>
                      {s.startDate && s.endDate ? (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(s.startDate), "MMM d")} –{" "}
                          {format(new Date(s.endDate), "MMM d, yyyy")}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {progress.completedItems}/{progress.totalItems} items ·{" "}
                        {progress.percentComplete}%
                      </p>
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
