import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/page-header";
import { WorkItemForm } from "@/components/work-item/WorkItemForm";

export const metadata: Metadata = { title: "New Work Item" };

export default async function NewWorkItemPage() {
  await requirePermission("workitem.create");

  const [projects, users, epics, sprints] = await Promise.all([
    prisma.project.findMany({
      orderBy: { name: "asc" },
      select: { id: true, key: true, name: true },
    }),
    prisma.user.findMany({
      where: { status: "active" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.epic.findMany({
      orderBy: { key: "asc" },
      select: { id: true, key: true, title: true, projectId: true },
    }),
    prisma.sprint.findMany({
      where: { status: { in: ["active", "planned"] } },
      orderBy: { startDate: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="New Work Item"
        description="Create an epic, story, task, bug or subtask."
      />
      <WorkItemForm
        projects={projects.map((p) => ({ id: p.id, label: `${p.key} · ${p.name}` }))}
        users={users.map((u) => ({ id: u.id, label: u.name }))}
        epics={epics.map((e) => ({
          id: e.id,
          label: `${e.key} · ${e.title}`,
          projectId: e.projectId,
        }))}
        sprints={sprints.map((s) => ({ id: s.id, label: s.name }))}
      />
    </div>
  );
}
