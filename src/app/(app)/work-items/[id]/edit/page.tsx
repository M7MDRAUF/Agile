import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { can, canEditWorkItem } from "@/lib/domain/permissions";
import { PageHeader } from "@/components/page-header";
import { EditWorkItemForm } from "@/components/work-item/EditWorkItemForm";

export const metadata: Metadata = { title: "Edit Work Item" };

export default async function EditWorkItemPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const item = await prisma.workItem.findUnique({ where: { id } });
  if (!item) notFound();

  const editable =
    can(user.role, "workitem.edit_any") ||
    canEditWorkItem(user.role, {
      assigneeId: item.assigneeId,
      reporterId: item.reporterId,
      userId: user.id,
    });
  if (!editable) redirect(`/work-items/${id}`);

  const [epics, sprints] = await Promise.all([
    prisma.epic.findMany({
      where: { projectId: item.projectId },
      orderBy: { title: "asc" },
      select: { id: true, title: true, key: true },
    }),
    prisma.sprint.findMany({
      where: { projectId: item.projectId, status: { in: ["planned", "active"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader title={`Edit ${item.key}`} description="Update the details of this work item." />
      <EditWorkItemForm
        item={{
          id: item.id,
          title: item.title,
          description: item.description ?? "",
          type: item.type,
          priority: item.priority,
          acceptanceCriteria: item.acceptanceCriteria ?? "",
          epicId: item.epicId ?? "",
          sprintId: item.sprintId ?? "",
          storyPoints: item.storyPoints,
          dueDate: item.dueDate ? format(new Date(item.dueDate), "yyyy-MM-dd") : "",
        }}
        epics={epics.map((e) => ({ id: e.id, label: `${e.key} · ${e.title}` }))}
        sprints={sprints.map((s) => ({ id: s.id, label: s.name }))}
      />
    </div>
  );
}
