"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/domain/permissions";
import { PROJECT_STATUSES } from "@/lib/domain/constants";

// ActivityLog.workItemId is a required (non-nullable) field in the schema, so
// project-level actions are recorded in AuditLog instead, which is designed for
// entity-level audit trails.
async function logProjectAudit(
  actorId: string,
  action: string,
  projectId: string,
  detail?: string,
) {
  await prisma.auditLog.create({
    data: { actorId, action, entityType: "project", entityId: projectId, detail },
  });
}

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------

const createSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer"),
  key: z
    .string()
    .min(2, "Key must be at least 2 characters")
    .max(6, "Key must be 6 characters or fewer")
    .regex(/^[A-Z0-9]+$/, "Key must be uppercase letters and numbers only"),
  description: z.string().optional(),
  status: z.string().default("active"),
});

export interface CreateProjectState {
  error?: string;
  ok?: boolean;
  projectId?: string;
}

export async function createProject(
  _prev: CreateProjectState,
  formData: FormData,
): Promise<CreateProjectState> {
  const user = await requireUser();
  if (!can(user.role, "project.create")) return { error: "You cannot create projects" };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    key: formData.get("key"),
    description: formData.get("description") || undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const existing = await prisma.project.findUnique({ where: { key: parsed.data.key } });
  if (existing) return { error: `Key "${parsed.data.key}" is already in use by another project` };

  const project = await prisma.project.create({
    data: {
      name: parsed.data.name,
      key: parsed.data.key,
      description: parsed.data.description || null,
      status: parsed.data.status,
      ownerId: user.id,
    },
  });

  await logProjectAudit(user.id, "created", project.id);
  revalidatePath("/projects");
  return { ok: true, projectId: project.id };
}

// ---------------------------------------------------------------------------
// updateProject
// ---------------------------------------------------------------------------

const updateSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or fewer")
    .optional(),
  description: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});

export interface UpdateProjectState {
  error?: string;
  ok?: boolean;
}

export async function updateProject(
  projectId: string,
  _prev: UpdateProjectState,
  formData: FormData,
): Promise<UpdateProjectState> {
  const user = await requireUser();
  if (!can(user.role, "project.edit")) return { error: "You cannot edit projects" };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Project not found" };

  // Pass `undefined` for fields that were not submitted so Zod's `.optional()`
  // leaves them out of the validated output, allowing us to do a partial update.
  const parsed = updateSchema.safeParse({
    name: formData.get("name") || undefined,
    description:
      formData.get("description") !== null
        ? String(formData.get("description"))
        : undefined,
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const data: { name?: string; description?: string | null; status?: string } = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description || null;
  if (parsed.data.status !== undefined) data.status = parsed.data.status;

  if (Object.keys(data).length > 0) {
    await prisma.project.update({ where: { id: projectId }, data });
  }

  await logProjectAudit(user.id, "edited", projectId);
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// archiveProject
// ---------------------------------------------------------------------------

// NOTE: "project.archive" is not defined in PERMISSIONS; fall back to
// "project.edit" which is the closest write-level permission for projects.

export interface ArchiveProjectState {
  error?: string;
  ok?: boolean;
}

export async function archiveProject(projectId: string): Promise<ArchiveProjectState> {
  const user = await requireUser();
  if (!can(user.role, "project.edit")) return { error: "You cannot archive projects" };

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: "Project not found" };
  if (project.status === "archived") return { error: "Project is already archived" };

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "archived" },
  });

  await logProjectAudit(user.id, "archived", projectId);
  revalidatePath("/projects");
  return { ok: true };
}
