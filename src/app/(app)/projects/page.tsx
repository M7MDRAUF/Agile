import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { can } from "@/lib/domain/permissions";
import { isDone } from "@/lib/domain/metrics";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { HealthBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { humanize } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const user = await requirePermission("project.view");

  const projects = await prisma.project.findMany({
    orderBy: { name: "asc" },
    include: {
      owner: true,
      team: true,
      workItems: { select: { status: true } },
      _count: { select: { sprints: true, epics: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Projects"
        description="All delivery initiatives across the organization."
        actions={
          can(user.role, "project.create") ? (
            <Link href="/projects/new" className={buttonVariants()}>
              <Plus className="size-4" /> New Project
            </Link>
          ) : null
        }
      />
      {projects.length === 0 ? (
        <EmptyState title="No projects yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const total = p.workItems.length;
            const done = p.workItems.filter((w) => isDone(w.status)).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="h-full transition-colors hover:border-primary">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="muted">{p.key}</Badge>
                      <HealthBadge health={p.health} />
                    </div>
                    <CardTitle className="mt-2">{p.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {p.description || "No description."}
                    </p>
                    <div>
                      <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                        <span>
                          {done}/{total} done
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {p._count.epics} epics · {p._count.sprints} sprints · {humanize(p.status)}
                      </span>
                      {p.owner ? (
                        <Avatar name={p.owner.name} color={p.owner.avatarColor} size={24} />
                      ) : null}
                    </div>
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
