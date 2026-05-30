import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { can, canEditWorkItem } from "@/lib/domain/permissions";
import { humanize } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { WorkItemTypeIcon, workItemTypeLabel } from "@/components/work-item/type-icon";
import { StatusSelect } from "@/components/work-item/StatusSelect";
import { AssigneeSelect } from "@/components/work-item/AssigneeSelect";
import { CommentForm } from "@/components/work-item/CommentForm";
import { CreateBlocker, ResolveBlocker } from "@/components/work-item/BlockerControls";
import { WorkItemLinks } from "@/components/work-item/work-item-links";
import { buttonVariants } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export const metadata: Metadata = { title: "Work Item" };

export default async function WorkItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission("workitem.view");
  const { id } = await params;

  // PERF-007: fetch the item and the assignee list in parallel — the user
  // list does not depend on the item, so serialising the round-trips wastes
  // ~1 RTT on every detail-page load.
  const [item, users] = await Promise.all([
    prisma.workItem.findUnique({
      where: { id },
      include: {
        project: true,
        epic: true,
        sprint: true,
        assignee: true,
        reporter: true,
        parent: true,
        subtasks: { include: { assignee: true } },
        comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
        activities: { include: { actor: true }, orderBy: { createdAt: "desc" }, take: 30 },
        blockers: { include: { owner: true }, orderBy: { createdAt: "desc" } },
        labels: { include: { label: true } },
        links: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.user.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!item) notFound();

  const editable =
    can(user.role, "workitem.edit_any") ||
    canEditWorkItem(user.role, {
      assigneeId: item.assigneeId,
      reporterId: item.reporterId,
      userId: user.id,
    });
  const openBlockers = item.blockers.filter((b) => b.status === "open");

  return (
    <div>
      <PageHeader
        title={item.title}
        description={
          <span className="flex items-center gap-2">
            <WorkItemTypeIcon type={item.type} />
            <span className="font-mono text-xs">{item.key}</span>
            <span>· {workItemTypeLabel(item.type)} in</span>
            <Link href={`/projects/${item.projectId}`} className="hover:underline">
              {item.project.name}
            </Link>
          </span>
        }
        actions={
          editable ? (
            <Link
              href={`/work-items/${item.id}/edit`}
              className={buttonVariants({ variant: "outline" })}
            >
              <Pencil className="size-4" /> Edit
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                {item.description || "No description provided."}
              </p>
              {item.acceptanceCriteria ? (
                <div className="mt-4">
                  <h4 className="mb-1 text-sm font-semibold">Acceptance Criteria</h4>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {item.acceptanceCriteria}
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {item.subtasks.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Subtasks ({item.subtasks.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {item.subtasks.map((s) => (
                  <Link
                    key={s.id}
                    href={`/work-items/${s.id}`}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-accent"
                  >
                    <WorkItemTypeIcon type={s.type} />
                    <span className="flex-1 truncate text-sm">{s.title}</span>
                    <StatusBadge status={s.status} />
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Blockers
                {can(user.role, "blocker.create") ? <CreateBlocker itemId={item.id} /> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {item.blockers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No blockers.</p>
              ) : (
                item.blockers.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                  >
                    <Badge variant={b.status === "open" ? "danger" : "success"}>
                      {humanize(b.status)}
                    </Badge>
                    <span className="flex-1 text-sm">{b.reason}</span>
                    <span className="text-xs text-muted-foreground">{b.owner?.name ?? "—"}</span>
                    {b.status === "open" && can(user.role, "blocker.resolve") ? (
                      <ResolveBlocker blockerId={b.id} />
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Links</CardTitle>
            </CardHeader>
            <CardContent>
              <WorkItemLinks
                workItemId={item.id}
                canManage={editable}
                links={item.links.map((l) => ({
                  id: l.id,
                  type: l.type,
                  url: l.url,
                  label: l.label,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comments ({item.comments.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {item.comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.author.name} color={c.author.avatarColor} size={32} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.author.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{c.body}</p>
                  </div>
                </div>
              ))}
              {can(user.role, "comment.create") ? <CommentForm itemId={item.id} /> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Status</p>
                {editable ? (
                  <StatusSelect itemId={item.id} itemTitle={item.title} status={item.status} />
                ) : (
                  <StatusBadge status={item.status} />
                )}
                {openBlockers.length ? (
                  <p className="mt-1 text-xs text-destructive">
                    {openBlockers.length} open blocker(s)
                  </p>
                ) : null}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Assignee</p>
                {editable ? (
                  <AssigneeSelect itemId={item.id} assigneeId={item.assigneeId} users={users} />
                ) : item.assignee ? (
                  <span className="flex items-center gap-2">
                    <Avatar name={item.assignee.name} color={item.assignee.avatarColor} size={24} />
                    {item.assignee.name}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Priority</span>
                <PriorityBadge priority={item.priority} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Story Points</span>
                <span className="tabular-nums">{item.storyPoints ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reporter</span>
                <span>{item.reporter?.name ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sprint</span>
                <span>{item.sprint ? item.sprint.name : "Backlog"}</span>
              </div>
              {item.epic ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Epic</span>
                  <span>{item.epic.title}</span>
                </div>
              ) : null}
              {item.dueDate ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due</span>
                  <span>{format(new Date(item.dueDate), "MMM d, yyyy")}</span>
                </div>
              ) : null}
              {item.labels.length ? (
                <div>
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Labels</p>
                  <div className="flex flex-wrap gap-1">
                    {item.labels.map((l) => (
                      <Badge key={l.labelId} variant="muted">
                        {l.label.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {item.activities.map((a) => (
                <div key={a.id} className="flex gap-2 text-sm">
                  <Avatar name={a.actor?.name ?? "System"} color={a.actor?.avatarColor} size={20} />
                  <div className="flex-1">
                    <span className="font-medium">{a.actor?.name ?? "System"}</span>{" "}
                    <span className="text-muted-foreground">{a.message}</span>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
