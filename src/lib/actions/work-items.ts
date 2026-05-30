"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { canEditWorkItem, can } from "@/lib/domain/permissions";
import {
  WORK_ITEM_STATUSES,
  WORK_ITEM_TYPES,
  PRIORITIES,
  WORK_ITEM_LINK_TYPES,
  isValidStatusTransition,
} from "@/lib/domain/constants";
import {
  createWithSequentialKey,
  nextKeyNumber,
  workItemKey,
  isForeignKeyError,
} from "@/lib/domain/keys";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];
type Client = typeof prisma | TxClient;

function logActivity(
  client: Client,
  workItemId: string,
  actorId: string,
  type: string,
  message: string,
  oldValue?: string,
  newValue?: string,
) {
  return client.activityLog.create({
    data: { workItemId, actorId, type, message, oldValue, newValue },
  });
}

function notify(client: Client, userId: string, type: string, message: string, link: string) {
  return client.notification.create({ data: { userId, type, message, link } });
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

  if (!isValidStatusTransition(item.status, status)) {
    return {
      error: `Cannot move from ${item.status.replace(/_/g, " ")} to ${status.replace(/_/g, " ")}`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.workItem.update({
      where: { id: itemId },
      data: {
        status,
        completedAt:
          status === "done" ? new Date() : item.status === "done" ? null : item.completedAt,
      },
    });
    await logActivity(tx, itemId, user.id, "status_change", "changed status", item.status, status);

    if (item.assigneeId && item.assigneeId !== user.id) {
      await notify(
        tx,
        item.assigneeId,
        "system",
        `${item.key} moved to ${status.replace(/_/g, " ")}`,
        `/work-items/${itemId}`,
      );
    }
  });

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
  /** BUG-M21 — per-field validation messages keyed by form field name. */
  fieldErrors?: Record<string, string>;
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
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const [key, messages] of Object.entries(flat)) {
      if (messages && messages.length > 0) fieldErrors[key] = messages[0]!;
    }
    return {
      error: "Please correct the highlighted fields.",
      fieldErrors,
    };
  }

  const project = await prisma.project.findUnique({ where: { id: parsed.data.projectId } });
  if (!project) return { error: "Project not found" };

  try {
    // Derive the next key from the max numeric suffix (delete-safe) and retry on
    // unique-key collisions. Item + activity log + assignee notification are
    // written in a single transaction so the create is fully atomic.
    await createWithSequentialKey(
      async () => {
        const keys = await prisma.workItem.findMany({
          where: { projectId: project.id },
          select: { key: true },
        });
        return workItemKey(project.key, nextKeyNumber(keys.map((k) => k.key)));
      },
      (key) =>
        prisma.$transaction(async (tx) => {
          const created = await tx.workItem.create({
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
          await logActivity(tx, created.id, user.id, "created", "created this work item");
          if (parsed.data.assigneeId && parsed.data.assigneeId !== user.id) {
            await notify(
              tx,
              parsed.data.assigneeId,
              "assignment",
              `You were assigned ${created.key}`,
              `/work-items/${created.id}`,
            );
          }
          return created;
        }),
    );
  } catch (error) {
    if (isForeignKeyError(error)) return { error: "Related record no longer exists" };
    throw error;
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

  await prisma.$transaction(async (tx) => {
    await tx.workItem.update({
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
    await logActivity(tx, itemId, user.id, "edited", "edited the work item details");
  });

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
  await prisma.$transaction(async (tx) => {
    await tx.workItem.update({ where: { id: itemId }, data: { assigneeId } });
    await logActivity(tx, itemId, user.id, "assignment", "changed the assignee");
    if (assigneeId && assigneeId !== user.id) {
      await notify(
        tx,
        assigneeId,
        "assignment",
        `You were assigned ${item.key}`,
        `/work-items/${itemId}`,
      );
    }
  });
  revalidatePath(`/work-items/${itemId}`);
  // BUG-L04: the assignee is rendered on the board, backlog and list views, so
  // revalidate those too or they show a stale avatar until the next visit.
  revalidatePath("/work-items");
  revalidatePath("/boards/kanban");
  revalidatePath("/backlog");
  revalidatePath("/my-work");
  return { ok: true };
}

/** Add a comment to a work item. */
export async function addComment(itemId: string, body: string) {
  const user = await requireUser();
  if (!can(user.role, "comment.create")) return { error: "Not permitted" };
  const text = body.trim();
  if (!text) return { error: "Comment cannot be empty" };
  if (text.length > 5000) return { error: "Comment is too long (max 5000 characters)" };
  const item = await prisma.workItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Not found" };
  await prisma.$transaction(async (tx) => {
    await tx.comment.create({ data: { workItemId: itemId, authorId: user.id, body: text } });
    await logActivity(tx, itemId, user.id, "comment", "added a comment");
    if (item.assigneeId && item.assigneeId !== user.id) {
      await notify(
        tx,
        item.assigneeId,
        "comment",
        `New comment on ${item.key}`,
        `/work-items/${itemId}`,
      );
    }
  });
  revalidatePath(`/work-items/${itemId}`);
  return { ok: true };
}

/** Mark a work item as blocked with a reason. */
export async function createBlocker(itemId: string, reason: string) {
  const user = await requireUser();
  if (!can(user.role, "blocker.create")) return { error: "Not permitted" };
  const text = reason.trim();
  if (!text) return { error: "Reason is required" };
  if (text.length > 1000) return { error: "Reason is too long (max 1000 characters)" };
  const item = await prisma.workItem.findUnique({ where: { id: itemId } });
  if (!item) return { error: "Not found" };
  await prisma.$transaction(async (tx) => {
    await tx.blocker.create({
      data: { workItemId: itemId, reason: text, ownerId: user.id, status: "open" },
    });
    await tx.workItem.update({ where: { id: itemId }, data: { status: "blocked" } });
    await logActivity(
      tx,
      itemId,
      user.id,
      "blocker",
      "flagged this item as blocked",
      undefined,
      text,
    );
  });
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
  await prisma.$transaction(async (tx) => {
    await tx.blocker.update({
      where: { id: blockerId },
      data: { status: "resolved", resolvedAt: new Date() },
    });
    const remaining = await tx.blocker.count({
      where: { workItemId: blocker.workItemId, status: "open" },
    });
    if (remaining === 0) {
      await tx.workItem.update({
        where: { id: blocker.workItemId },
        data: { status: "in_progress" },
      });
    }
    await logActivity(tx, blocker.workItemId, user.id, "blocker", "resolved a blocker");
  });
  revalidatePath(`/work-items/${blocker.workItemId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Backlog prioritization (BUG-H08)
// ---------------------------------------------------------------------------

const reorderSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  /** Ordered work-item ids, top (rank 0) first. */
  orderedIds: z.array(z.string().min(1)).min(1, "Nothing to reorder").max(500),
});

export interface ReorderBacklogState {
  error?: string;
  ok?: boolean;
}

/**
 * Persist an explicit backlog ordering. The caller sends the full ordered list
 * of work-item ids for one project; each item's `rank` is written to its index
 * so lower rank sorts higher. Gated by `backlog.prioritize`.
 */
export async function reorderBacklog(
  projectId: string,
  orderedIds: string[],
): Promise<ReorderBacklogState> {
  const user = await requireUser();
  if (!can(user.role, "backlog.prioritize")) {
    return { error: "You do not have permission to reorder the backlog" };
  }

  const parsed = reorderSchema.safeParse({ projectId, orderedIds });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  // Only rank items that genuinely belong to this project's backlog, so a
  // tampered payload cannot move items between projects or out of the backlog.
  const owned = await prisma.workItem.findMany({
    where: {
      projectId: parsed.data.projectId,
      sprintId: null,
      status: { in: ["backlog", "ready"] },
      id: { in: parsed.data.orderedIds },
    },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((i) => i.id));
  const finalOrder = parsed.data.orderedIds.filter((id) => ownedIds.has(id));
  if (finalOrder.length === 0) return { error: "No matching backlog items to reorder" };

  await prisma.$transaction(
    finalOrder.map((id, index) => prisma.workItem.update({ where: { id }, data: { rank: index } })),
  );

  revalidatePath("/backlog");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Work-item links — PR / Figma / design (BUG-M19, BUG-M20)
// ---------------------------------------------------------------------------

const linkSchema = z.object({
  workItemId: z.string().min(1, "Work item is required"),
  type: z.enum(WORK_ITEM_LINK_TYPES),
  url: z
    .string()
    .min(1, "URL is required")
    .max(2000, "URL is too long")
    .url("Enter a valid URL")
    .refine((u) => /^https?:\/\//i.test(u), "Only http(s) links are allowed"),
  label: z.string().max(120, "Label must be 120 characters or fewer").optional(),
});

export interface WorkItemLinkState {
  error?: string;
  ok?: boolean;
}

/**
 * Attach an external link (pull request, Figma file, design doc) to a work
 * item. Permitted for anyone who may edit the work item.
 */
export async function addWorkItemLink(
  _prev: WorkItemLinkState,
  formData: FormData,
): Promise<WorkItemLinkState> {
  const user = await requireUser();

  const parsed = linkSchema.safeParse({
    workItemId: formData.get("workItemId"),
    type: formData.get("type"),
    url: formData.get("url"),
    label: formData.get("label") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const item = await prisma.workItem.findUnique({
    where: { id: parsed.data.workItemId },
    select: { id: true, assigneeId: true, reporterId: true },
  });
  if (!item) return { error: "Work item not found" };
  if (
    !canEditWorkItem(user.role, {
      assigneeId: item.assigneeId,
      reporterId: item.reporterId,
      userId: user.id,
    })
  ) {
    return { error: "You cannot add links to this work item" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.workItemLink.create({
      data: {
        workItemId: parsed.data.workItemId,
        type: parsed.data.type,
        url: parsed.data.url,
        label: parsed.data.label || null,
        createdById: user.id,
      },
    });
    await logActivity(
      tx,
      parsed.data.workItemId,
      user.id,
      "edited",
      `attached a ${parsed.data.type} link`,
    );
  });

  revalidatePath(`/work-items/${parsed.data.workItemId}`);
  return { ok: true };
}

/** Remove a previously attached link. Permitted for work-item editors. */
export async function removeWorkItemLink(linkId: string): Promise<WorkItemLinkState> {
  const user = await requireUser();

  const link = await prisma.workItemLink.findUnique({
    where: { id: linkId },
    select: {
      id: true,
      workItemId: true,
      workItem: { select: { assigneeId: true, reporterId: true } },
    },
  });
  if (!link) return { error: "Link not found" };
  if (
    !canEditWorkItem(user.role, {
      assigneeId: link.workItem.assigneeId,
      reporterId: link.workItem.reporterId,
      userId: user.id,
    })
  ) {
    return { error: "You cannot remove links from this work item" };
  }

  await prisma.workItemLink.delete({ where: { id: linkId } });
  revalidatePath(`/work-items/${link.workItemId}`);
  return { ok: true };
}
