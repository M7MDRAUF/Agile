"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/domain/permissions";

const createSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  projectId: z.string().min(1, "Project is required"),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  capacity: z.coerce.number().int().min(0).max(1000).optional(),
});

export interface SprintFormState {
  error?: string;
  ok?: boolean;
  id?: string;
}

/** Create a new sprint (scrum master / engineering manager / admin). */
export async function createSprint(
  _prev: SprintFormState,
  formData: FormData,
): Promise<SprintFormState> {
  const user = await requireUser();
  if (!can(user.role, "sprint.manage")) return { error: "You cannot manage sprints" };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    projectId: formData.get("projectId"),
    goal: formData.get("goal") || undefined,
    startDate: formData.get("startDate") || undefined,
    endDate: formData.get("endDate") || undefined,
    capacity: formData.get("capacity") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
  if (!project) return { error: "Project not found" };

  const sprint = await prisma.sprint.create({
    data: {
      name: parsed.data.name,
      projectId: parsed.data.projectId,
      goal: parsed.data.goal || null,
      status: "planned",
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      capacity: parsed.data.capacity ?? null,
    },
  });

  revalidatePath("/sprints");
  return { ok: true, id: sprint.id };
}

/** Start a planned sprint (sets status to active). */
export async function startSprint(sprintId: string) {
  const user = await requireUser();
  if (!can(user.role, "sprint.manage")) return { error: "Not permitted" };
  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
  if (!sprint) return { error: "Sprint not found" };
  if (sprint.status === "completed") return { error: "Sprint is already completed" };

  await prisma.$transaction(async (tx) => {
    await tx.sprint.update({
      where: { id: sprintId },
      data: { status: "active", startDate: sprint.startDate ?? new Date() },
    });
    // Notify everyone with work assigned in this sprint.
    const assignees = await tx.workItem.findMany({
      where: { sprintId, assigneeId: { not: null } },
      select: { assigneeId: true },
      distinct: ["assigneeId"],
    });
    const recipients = assignees
      .map((a) => a.assigneeId)
      .filter((id): id is string => Boolean(id) && id !== user.id);
    if (recipients.length > 0) {
      await tx.notification.createMany({
        data: recipients.map((userId) => ({
          userId,
          type: "sprint",
          message: `${sprint.name} has started`,
          link: `/sprints/${sprintId}`,
        })),
      });
    }
  });

  revalidatePath("/sprints");
  revalidatePath(`/sprints/${sprintId}`);
  revalidatePath("/boards/scrum");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Complete an active sprint. Generates a summary, moves incomplete items back
 * to the backlog (no sprint), and notifies assignees.
 */
export async function completeSprint(sprintId: string) {
  const user = await requireUser();
  if (!can(user.role, "sprint.manage")) return { error: "Not permitted" };
  const sprintWithItems = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: { workItems: { select: { id: true, status: true } } },
  });
  if (!sprintWithItems) return { error: "Sprint not found" };
  if (sprintWithItems.status === "completed") return { error: "Sprint is already completed" };

  const incompleteIds = sprintWithItems.workItems
    .filter((w) => w.status !== "done")
    .map((w) => w.id);

  await prisma.$transaction(async (tx) => {
    await tx.sprint.update({
      where: { id: sprintId },
      data: {
        status: "completed",
        completedAt: new Date(),
        endDate: sprintWithItems.endDate ?? new Date(),
      },
    });
    if (incompleteIds.length > 0) {
      // PERF-010 / REL-008: single updateMany instead of N updates.
      await tx.workItem.updateMany({
        where: { id: { in: incompleteIds } },
        data: { sprintId: null },
      });
    }
  });

  revalidatePath("/sprints");
  revalidatePath(`/sprints/${sprintId}`);
  revalidatePath("/boards/scrum");
  revalidatePath("/backlog");
  revalidatePath("/dashboard");
  return { ok: true, rolledOver: incompleteIds.length };
}

/** Add or remove a work item from a sprint. Pass null to move to backlog. */
export async function setWorkItemSprint(itemId: string, sprintId: string | null) {
  const user = await requireUser();
  if (!can(user.role, "sprint.manage") && !can(user.role, "workitem.edit_any")) {
    return { error: "Not permitted" };
  }
  const item = await prisma.workItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Work item not found" };

  await prisma.$transaction(async (tx) => {
    await tx.workItem.update({ where: { id: itemId }, data: { sprintId } });
    await tx.activityLog.create({
      data: {
        workItemId: itemId,
        actorId: user.id,
        type: "sprint_change",
        message: sprintId ? "added to a sprint" : "moved to the backlog",
      },
    });
  });

  revalidatePath(`/work-items/${itemId}`);
  revalidatePath("/sprints");
  if (sprintId) revalidatePath(`/sprints/${sprintId}`);
  revalidatePath("/backlog");
  return { ok: true };
}
