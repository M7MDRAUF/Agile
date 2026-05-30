import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { sprintProgress } from "@/lib/domain/metrics";
import { PageHeader } from "@/components/page-header";
import { Board, type BoardItem } from "@/components/board/Board";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Scrum Board" };

export default async function ScrumBoardPage() {
  await requirePermission("workitem.view");

  const sprint = await prisma.sprint.findFirst({
    where: { status: "active" },
    orderBy: { startDate: "desc" },
    include: {
      project: { select: { key: true, name: true } },
      workItems: {
        include: { assignee: { select: { name: true, avatarColor: true } } },
        orderBy: { rank: "asc" },
      },
    },
  });

  if (!sprint) {
    return (
      <div>
        <PageHeader title="Scrum Board" description="Active sprint board." />
        <EmptyState
          title="No active sprint"
          description="Start a sprint to populate the scrum board."
        />
      </div>
    );
  }

  const progress = sprintProgress(sprint.workItems);
  const items: BoardItem[] = sprint.workItems.map((w) => ({
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
        title="Scrum Board"
        description={`${sprint.project.name} · ${sprint.name} — ${progress.completedPoints}/${progress.totalPoints} pts (${progress.percentComplete}%)`}
      />
      <Board items={items} />
    </div>
  );
}
