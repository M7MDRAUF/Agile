import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { humanize } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { WorkItemTypeIcon } from "@/components/work-item/type-icon";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const { q } = await searchParams;
  const query = q?.trim();

  const [workItems, projects, users] = query
    ? await Promise.all([
        prisma.workItem.findMany({
          where: { OR: [{ title: { contains: query } }, { key: { contains: query } }] },
          include: { project: { select: { key: true } } },
          take: 25,
        }),
        prisma.project.findMany({
          where: { OR: [{ name: { contains: query } }, { key: { contains: query } }] },
          take: 10,
        }),
        prisma.user.findMany({
          where: { OR: [{ name: { contains: query } }, { email: { contains: query } }] },
          take: 10,
        }),
      ])
    : [[], [], []];

  const totalResults = workItems.length + projects.length + users.length;

  return (
    <div>
      <PageHeader title="Search" description="Find work items, projects and people." />

      <form method="GET" className="mb-6 flex gap-2">
        <Input name="q" defaultValue={query} placeholder="Search…" className="max-w-md" autoFocus />
        <Button type="submit">Search</Button>
      </form>

      {!query ? (
        <EmptyState
          title="Start typing to search"
          description="Search across work items, projects and users."
        />
      ) : totalResults === 0 ? (
        <EmptyState title="No results" description={`Nothing matched “${query}”.`} />
      ) : (
        <div className="space-y-6">
          {workItems.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Work Items ({workItems.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {workItems.map((i) => (
                  <Link
                    key={i.id}
                    href={`/work-items/${i.id}`}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-accent"
                  >
                    <WorkItemTypeIcon type={i.type} />
                    <span className="font-mono text-xs text-muted-foreground">{i.key}</span>
                    <span className="flex-1 truncate text-sm font-medium">{i.title}</span>
                    <StatusBadge status={i.status} />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {projects.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Projects ({projects.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-accent"
                  >
                    <Badge variant="muted">{p.key}</Badge>
                    <span className="flex-1 text-sm font-medium">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{humanize(p.status)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {users.length ? (
            <Card>
              <CardHeader>
                <CardTitle>People ({users.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/users/${u.id}`}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2 hover:bg-accent"
                  >
                    <Avatar name={u.name} color={u.avatarColor} size={28} />
                    <span className="flex-1 text-sm font-medium">{u.name}</span>
                    <span className="text-xs text-muted-foreground">{humanize(u.role)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
