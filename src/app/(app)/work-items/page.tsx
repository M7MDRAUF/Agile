import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { can } from "@/lib/domain/permissions";
import { WORK_ITEM_TYPES, WORK_ITEM_STATUSES, PRIORITIES } from "@/lib/domain/constants";
import { humanize } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Avatar } from "@/components/ui/avatar";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { WorkItemTypeIcon } from "@/components/work-item/type-icon";
import { EmptyState } from "@/components/empty-state";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "Work Items" };

const PAGE_SIZE_DEFAULT = 25;
const PAGE_SIZE_MAX = 100;

interface SearchParams {
  type?: string;
  status?: string;
  priority?: string;
  project?: string;
  q?: string;
  page?: string;
  pageSize?: string;
}

export default async function WorkItemsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await requirePermission("workitem.view");
  const sp = await searchParams;

  // Parse and clamp pagination params.
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = Math.min(
    PAGE_SIZE_MAX,
    Math.max(1, parseInt(sp.pageSize ?? String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT),
  );
  const skip = (page - 1) * pageSize;

  const where: Prisma.WorkItemWhereInput = {};
  if (sp.type) where.type = sp.type;
  if (sp.status) where.status = sp.status;
  if (sp.priority) where.priority = sp.priority;
  if (sp.project) where.projectId = sp.project;
  if (sp.q) where.title = { contains: sp.q };

  const [items, totalCount, projects] = await Promise.all([
    prisma.workItem.findMany({
      where,
      include: { project: { select: { key: true } }, assignee: true },
      orderBy: [{ updatedAt: "desc" }],
      take: pageSize,
      skip,
    }),
    prisma.workItem.count({ where }),
    prisma.project.findMany({ orderBy: { key: "asc" }, select: { id: true, key: true } }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  /**
   * Build a URL for the given page number while preserving all active filters.
   * pageSize is only forwarded when the caller explicitly set it, so default
   * page sizes don't pollute the URL.
   */
  const buildPageHref = (targetPage: number): string => {
    const params = new URLSearchParams();
    if (sp.q) params.set("q", sp.q);
    if (sp.type) params.set("type", sp.type);
    if (sp.status) params.set("status", sp.status);
    if (sp.priority) params.set("priority", sp.priority);
    if (sp.project) params.set("project", sp.project);
    if (sp.pageSize) params.set("pageSize", sp.pageSize);
    params.set("page", String(targetPage));
    return `/work-items?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader
        title="Work Items"
        description="All epics, stories, tasks, bugs and subtasks."
        actions={
          can(user.role, "workitem.create") ? (
            <Link href="/work-items/new" className={buttonVariants()}>
              <Plus className="size-4" /> New Work Item
            </Link>
          ) : null
        }
      />

      {/* Filter form — submitting resets `page` to 1 naturally (page input not included). */}
      <form
        method="GET"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3"
      >
        <Input
          name="q"
          defaultValue={sp.q}
          placeholder="Search title…"
          aria-label="Search work items by title"
          className="w-48"
        />
        <Select
          name="type"
          defaultValue={sp.type ?? ""}
          aria-label="Filter by type"
          className="w-36"
        >
          <option value="">All types</option>
          {WORK_ITEM_TYPES.map((t) => (
            <option key={t} value={t}>
              {humanize(t)}
            </option>
          ))}
        </Select>
        <Select
          name="status"
          defaultValue={sp.status ?? ""}
          aria-label="Filter by status"
          className="w-40"
        >
          <option value="">All statuses</option>
          {WORK_ITEM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {humanize(s)}
            </option>
          ))}
        </Select>
        <Select
          name="priority"
          defaultValue={sp.priority ?? ""}
          aria-label="Filter by priority"
          className="w-36"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {humanize(p)}
            </option>
          ))}
        </Select>
        <Select
          name="project"
          defaultValue={sp.project ?? ""}
          aria-label="Filter by project"
          className="w-36"
        >
          <option value="">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.key}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        <Link href="/work-items" className={buttonVariants({ variant: "ghost" })}>
          Reset
        </Link>
      </form>

      {totalCount === 0 ? (
        <EmptyState
          title="No work items match your filters"
          description="Try adjusting or resetting the filters above."
        />
      ) : (
        <>
          <Table>
            <THead>
              <TR>
                <TH>Key</TH>
                <TH>Title</TH>
                <TH>Project</TH>
                <TH>Status</TH>
                <TH>Priority</TH>
                <TH>Points</TH>
                <TH>Assignee</TH>
              </TR>
            </THead>
            <TBody>
              {items.map((i) => (
                <TR key={i.id}>
                  <TD className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                    {i.key}
                  </TD>
                  <TD>
                    <Link
                      href={`/work-items/${i.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <WorkItemTypeIcon type={i.type} />
                      <span className="line-clamp-1 font-medium">{i.title}</span>
                    </Link>
                  </TD>
                  <TD className="text-sm text-muted-foreground">{i.project.key}</TD>
                  <TD>
                    <StatusBadge status={i.status} />
                  </TD>
                  <TD>
                    <PriorityBadge priority={i.priority} />
                  </TD>
                  <TD className="tabular-nums">{i.storyPoints ?? "—"}</TD>
                  <TD>
                    {i.assignee ? (
                      <span className="flex items-center gap-2">
                        <Avatar name={i.assignee.name} color={i.assignee.avatarColor} size={24} />
                        <span className="hidden text-sm sm:block">{i.assignee.name}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          <Pagination
            page={page}
            pageSize={pageSize}
            totalCount={totalCount}
            totalPages={totalPages}
            href={buildPageHref}
          />
        </>
      )}
    </div>
  );
}
