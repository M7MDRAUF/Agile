import type { Metadata } from "next";
import Link from "next/link";
import { formatDistanceToNow, isPast } from "date-fns";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { StatusSelect } from "@/components/work-item/StatusSelect";
import { WorkItemTypeIcon } from "@/components/work-item/type-icon";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "My Work" };

type Item = Awaited<ReturnType<typeof prisma.workItem.findMany>>[number] & {
  project: { key: string };
};

function ItemRow({ item }: { item: Item }) {
  const overdue = item.dueDate && isPast(new Date(item.dueDate)) && item.status !== "done";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2.5">
      <WorkItemTypeIcon type={item.type} />
      <Link href={`/work-items/${item.id}`} className="min-w-0 flex-1 hover:underline">
        <span className="text-xs font-medium text-muted-foreground">{item.key}</span>
        <p className="truncate text-sm font-medium">{item.title}</p>
      </Link>
      <PriorityBadge priority={item.priority} />
      {overdue ? <Badge variant="danger">Overdue</Badge> : null}
      <div className="w-36">
        <StatusSelect itemId={item.id} itemTitle={item.title} status={item.status} className="h-8 text-xs" />
      </div>
    </div>
  );
}

export default async function MyWorkPage() {
  const user = await requireUser();

  const [activeSprintItems, overdue, blocked, recent] = await Promise.all([
    prisma.workItem.findMany({
      where: {
        assigneeId: user.id,
        sprint: { status: "active" },
        status: { notIn: ["done", "canceled"] },
      },
      include: { project: { select: { key: true } } },
      orderBy: { priority: "desc" },
    }),
    prisma.workItem.findMany({
      where: {
        assigneeId: user.id,
        dueDate: { lt: new Date() },
        status: { notIn: ["done", "canceled"] },
      },
      include: { project: { select: { key: true } } },
    }),
    prisma.workItem.findMany({
      where: { assigneeId: user.id, status: "blocked" },
      include: { project: { select: { key: true } } },
    }),
    prisma.workItem.findMany({
      where: { assigneeId: user.id },
      include: { project: { select: { key: true } } },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="My Work"
        description="Everything assigned to you — what to focus on today."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Sprint ({activeSprintItems.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSprintItems.length ? (
              activeSprintItems.map((i) => <ItemRow key={i.id} item={i as Item} />)
            ) : (
              <EmptyState
                title="Nothing in the active sprint"
                description="You have no assigned work in the current sprint."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overdue ({overdue.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdue.length ? (
              overdue.map((i) => <ItemRow key={i.id} item={i as Item} />)
            ) : (
              <EmptyState
                title="No overdue work"
                description="You are all caught up on due dates."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Blocked ({blocked.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {blocked.length ? (
              blocked.map((i) => <ItemRow key={i.id} item={i as Item} />)
            ) : (
              <EmptyState title="No blocked work" description="None of your items are blocked." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently Updated</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.map((i) => (
              <div
                key={i.id}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
              >
                <WorkItemTypeIcon type={i.type} />
                <Link href={`/work-items/${i.id}`} className="min-w-0 flex-1 hover:underline">
                  <span className="text-xs text-muted-foreground">
                    {i.project.key}-{i.key.split("-")[1]}
                  </span>
                  <p className="truncate text-sm">{i.title}</p>
                </Link>
                <StatusBadge status={i.status} />
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {formatDistanceToNow(new Date(i.updatedAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
