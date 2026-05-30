import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { LIST_PAGE_LIMIT } from "@/lib/domain/constants";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { Board, type BoardItem } from "@/components/board/Board";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Kanban Board" };

export default async function KanbanBoardPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  await requirePermission("workitem.view");
  const sp = await searchParams;

  const projects = await prisma.project.findMany({
    orderBy: { key: "asc" },
    select: { id: true, key: true, name: true },
  });
  const projectId = sp.project ?? projects[0]?.id;

  if (!projectId) {
    return (
      <div>
        <PageHeader title="Kanban Board" />
        <EmptyState title="No projects available" />
      </div>
    );
  }

  const workItems = await prisma.workItem.findMany({
    where: { projectId, status: { not: "canceled" } },
    include: { assignee: { select: { name: true, avatarColor: true } } },
    orderBy: { rank: "asc" },
    take: LIST_PAGE_LIMIT,
  });

  const items: BoardItem[] = workItems.map((w) => ({
    id: w.id,
    key: w.key,
    title: w.title,
    type: w.type,
    status: w.status,
    priority: w.priority,
    storyPoints: w.storyPoints,
    assignee: w.assignee,
  }));

  return (
    <div>
      <PageHeader
        title="Kanban Board"
        description="Continuous flow across all work in a project."
        actions={
          <form method="GET" className="flex items-center gap-2">
            <Select
              name="project"
              aria-label="Filter board by project"
              defaultValue={projectId}
              className="w-48"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.key} · {p.name}
                </option>
              ))}
            </Select>
            <Button type="submit" variant="secondary">
              View
            </Button>
          </form>
        }
      />
      <Board items={items} />
    </div>
  );
}
