import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { can } from "@/lib/domain/permissions";
import { sprintProgress } from "@/lib/domain/metrics";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SprintStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Sprints" };

export default async function SprintsPage() {
  const user = await requireUser();
  const canManage = can(user.role, "sprint.manage");

  const sprints = await prisma.sprint.findMany({
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
    include: {
      project: { select: { key: true, name: true } },
      workItems: { select: { status: true, storyPoints: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Sprints"
        description="Time-boxed iterations across every project."
        actions={
          canManage ? (
            <Link href="/sprints/new" className={buttonVariants()}>
              <Plus className="size-4" /> New sprint
            </Link>
          ) : undefined
        }
      />
      {sprints.length === 0 ? (
        <EmptyState title="No sprints" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sprints.map((s) => {
            const progress = sprintProgress(s.workItems);
            return (
              <Link key={s.id} href={`/sprints/${s.id}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{s.project.key}</span>
                      <SprintStatusBadge status={s.status} />
                    </div>
                    <CardTitle className="mt-1">{s.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {s.goal ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{s.goal}</p>
                    ) : null}
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>
                          {progress.completedPoints}/{progress.totalPoints} pts
                        </span>
                        <span>{progress.percentComplete}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${progress.percentComplete}%` }}
                        />
                      </div>
                    </div>
                    {s.startDate && s.endDate ? (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(s.startDate), "MMM d")} –{" "}
                        {format(new Date(s.endDate), "MMM d, yyyy")}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
