"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { canEditWorkItem, can } from "@/lib/domain/permissions";
import { WORK_ITEM_STATUSES, WORK_ITEM_TYPES, PRIORITIES } from "@/lib/domain/constants";

async function logActivity(
  workItemId: string,
  actorId: string,
  type: string,
  message: string,
  oldValue?: string,
  newValue?: string,
) {
  await prisma.activityLog.create({
    data: { workItemId, actorId, type, message, oldValue, newValue },
  });
}

async function notify(userId: string, type: string, message: string, link: string) {
  await prisma.notification.create({ data: { userId, type, message, link } });
}

/** Move a work item to a new status (board / detail / My Work). */
export async function updateWorkItemStatus(itemId: string, status: string) {
  const user = await requireUser();
  if (!(WORK_ITEM_STATUSES as readonly string[]).includes(status)) {
    return { error: "Invalid status" };
  }
  const item = await prisma.workItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Work item not found" };

  if (
    !can(user.role, "board.move") &&
    !canEditWorkItem(user.role, {
      assigneeId: item.assigneeId,
      reporterId: item.reporterId,
      userId: user.id,
    })
  ) {
    return { error: "You do not have permission to update this item" };
  }

  await prisma.workItem.update({
    where: { id: itemId },
    data: {
      status,
      completedAt:
        status === "done" ? new Date() : item.status === "done" ? null : item.completedAt,
    },
  });
  await logActivity(itemId, user.id, "status_change", "changed status", item.status, status);

  if (item.assigneeId && item.assigneeId !== user.id) {
    await notify(
      item.assigneeId,
      "system",
      `${item.key} moved to ${status.replace(/_/g, " ")}`,
      `/work-items/${itemId}`,
    );
  }

  revalidatePath("/boards/scrum");
  revalidatePath("/boards/kanban");
  revalidatePath("/my-work");
  revalidatePath(`/work-items/${itemId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

const createSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  type: z.enum(WORK_ITEM_TYPES),
  priority: z.enum(PRIORITIES),
  projectId: z.string().min(1, "Project is required"),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  epicId: z.string().optional(),
  sprintId: z.string().optional(),
  storyPoints: z.coerce.number().int().min(0).max(100).optional(),
  acceptanceCriteria: z.string().optional(),
});

export interface CreateWorkItemState {
  error?: string;
  ok?: boolean;
}

export async function createWorkItem(
  _prev: CreateWorkItemState,
  formData: FormData,
): Promise<CreateWorkItemState> {
  const user = await requireUser();
  if (!can(user.role, "workitem.create")) return { error: "You cannot create work items" };

  const parsed = createSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    priority: formData.get("priority"),
    projectId: formData.get("projectId"),
    description: formData.get("description") || undefined,
    assigneeId: formData.get("assigneeId") || undefined,
    epicId: formData.get("epicId") || undefined,
    sprintId: formData.get("sprintId") || undefined,
    storyPoints: formData.get("storyPoints") || undefined,
    acceptanceCriteria: formData.get("acceptanceCriteria") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
  if (!project) return { error: "Project not found" };

  const item = await prisma.$transaction(async (tx) => {
    // Bounded lookup: pull only the most recently created item for this project
    // to derive the next sequential suffix. Race conditions on concurrent
    // creates are addressed in Batch 4 via a dedicated counter table.
    const lastItem = await tx.workItem.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: "desc" },
      select: { key: true },
    });
    const lastNum = lastItem ? parseInt(lastItem.key.split("-").pop() ?? "0", 10) : 0;
    const key = `${project.key}-${lastNum + 1}`;
    return tx.workItem.create({
      data: {
        key,
        title: parsed.data.title,
        description: parsed.data.description,
        type: parsed.data.type,
        priority: parsed.data.priority,
        status: "backlog",
        projectId: project.id,
        reporterId: user.id,
        assigneeId: parsed.data.assigneeId || null,
        epicId: parsed.data.epicId || null,
        sprintId: parsed.data.sprintId || null,
        storyPoints: parsed.data.storyPoints ?? null,
        acceptanceCriteria: parsed.data.acceptanceCriteria || null,
      },
    });
  });
  await logActivity(item.id, user.id, "created", "created this work item");
  if (parsed.data.assigneeId && parsed.data.assigneeId !== user.id) {
    await notify(
      parsed.data.assigneeId,
      "assignment",
      `You were assigned ${item.key}`,
      `/work-items/${item.id}`,
    );
  }

  revalidatePath("/work-items");
  revalidatePath("/backlog");
  return { ok: true };
}

const updateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  type: z.enum(WORK_ITEM_TYPES),
  priority: z.enum(PRIORITIES),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(),
  sprintId: z.string().optional(),
  storyPoints: z.coerce.number().int().min(0).max(100).optional(),
  dueDate: z.string().optional(),
});

export interface UpdateWorkItemState {
  error?: string;
  ok?: boolean;
}

/** Edit the core fields of an existing work item. */
export async function updateWorkItem(
  itemId: string,
  _prev: UpdateWorkItemState,
  formData: FormData,
): Promise<UpdateWorkItemState> {
  const user = await requireUser();
  const item = await prisma.workItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Work item not found" };
  if (
    !can(user.role, "workitem.edit_any") &&
    !canEditWorkItem(user.role, {
      assigneeId: item.assigneeId,
      reporterId: item.reporterId,
      userId: user.id,
    })
  ) {
    return { error: "You do not have permission to edit this item" };
  }

  const parsed = updateSchema.safeParse({
    title: formData.get("title"),
    type: formData.get("type"),
    priority: formData.get("priority"),
    description: formData.get("description") || undefined,
    acceptanceCriteria: formData.get("acceptanceCriteria") || undefined,
    epicId: formData.get("epicId") || undefined,
    sprintId: formData.get("sprintId") || undefined,
    storyPoints: formData.get("storyPoints") || undefined,
    dueDate: formData.get("dueDate") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.workItem.update({
    where: { id: itemId },
    data: {
      title: parsed.data.title,
      type: parsed.data.type,
      priority: parsed.data.priority,
      description: parsed.data.description || null,
      acceptanceCriteria: parsed.data.acceptanceCriteria || null,
      epicId: parsed.data.epicId || null,
      sprintId: parsed.data.sprintId || null,
      storyPoints: parsed.data.storyPoints ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    },
  });
  await logActivity(itemId, user.id, "edited", "edited the work item details");

  revalidatePath(`/work-items/${itemId}`);
  revalidatePath("/work-items");
  revalidatePath("/backlog");
  revalidatePath("/sprints");
  revalidatePath("/boards/scrum");
  revalidatePath("/boards/kanban");
  return { ok: true };
}

/** Reassign a work item to another user (or unassign). */
export async function assignWorkItem(itemId: string, assigneeId: string | null) {
  const user = await requireUser();
  const item = await prisma.workItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Not found" };
  if (
    !can(user.role, "workitem.edit_any") &&
    !canEditWorkItem(user.role, {
      assigneeId: item.assigneeId,
      reporterId: item.reporterId,
      userId: user.id,
    })
  ) {
    return { error: "Not permitted" };
  }
  await prisma.workItem.update({ where: { id: itemId }, data: { assigneeId } });
  await logActivity(itemId, user.id, "assignment", "changed the assignee");
  if (assigneeId && assigneeId !== user.id) {
    await notify(
      assigneeId,
      "assignment",
      `You were assigned ${item.key}`,
      `/work-items/${itemId}`,
    );
  }
  revalidatePath(`/work-items/${itemId}`);
  return { ok: true };
}

/** Add a comment to a work item. */
export async function addComment(itemId: string, body: string) {
  const user = await requireUser();
  if (!can(user.role, "comment.create")) return { error: "Not permitted" };
  const text = body.trim();
  if (!text) return { error: "Comment cannot be empty" };
  const item = await prisma.workItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Not found" };
  await prisma.comment.create({ data: { workItemId: itemId, authorId: user.id, body: text } });
  await logActivity(itemId, user.id, "comment", "added a comment");
  if (item.assigneeId && item.assigneeId !== user.id) {
    await notify(item.assigneeId, "comment", `New comment on ${item.key}`, `/work-items/${itemId}`);
  }
  revalidatePath(`/work-items/${itemId}`);
  return { ok: true };
}

/** Mark a work item as blocked with a reason. */
export async function createBlocker(itemId: string, reason: string) {
  const user = await requireUser();
  if (!can(user.role, "blocker.create")) return { error: "Not permitted" };
  const text = reason.trim();
  if (!text) return { error: "Reason is required" };
  const item = await prisma.workItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Not found" };
  await prisma.blocker.create({
    data: { workItemId: itemId, reason: text, ownerId: user.id, status: "open" },
  });
  await prisma.workItem.update({ where: { id: itemId }, data: { status: "blocked" } });
  await logActivity(itemId, user.id, "blocker", "flagged this item as blocked", undefined, text);
  revalidatePath(`/work-items/${itemId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Resolve an open blocker and return the item to In Progress. */
export async function resolveBlocker(blockerId: string) {
  const user = await requireUser();
  if (!can(user.role, "blocker.resolve")) return { error: "Not permitted" };
  const blocker = await prisma.blocker.findUnique({ where: { id: blockerId } });
  if (!blocker) return { error: "Not found" };
  await prisma.blocker.update({
    where: { id: blockerId },
    data: { status: "resolved", resolvedAt: new Date() },
  });
  const remaining = await prisma.blocker.count({
    where: { workItemId: blocker.workItemId, status: "open" },
  });
  if (remaining === 0) {
    await prisma.workItem.update({
      where: { id: blocker.workItemId },
      data: { status: "in_progress" },
    });
  }
  await logActivity(blocker.workItemId, user.id, "blocker", "resolved a blocker");
  revalidatePath(`/work-items/${blocker.workItemId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
