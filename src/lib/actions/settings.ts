"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/domain/permissions";
import { PREFERENCE_GROUPS, type PreferenceGroup } from "@/lib/domain/user-settings";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  title: z.string().optional(),
  department: z.string().optional(),
});

export interface ProfileFormState {
  error?: string;
  ok?: boolean;
}

/** Update the signed-in user's own profile (name, title, department). */
export async function updateProfile(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    title: formData.get("title") || undefined,
    department: formData.get("department") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      title: parsed.data.title || null,
      department: parsed.data.department || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "profile_update",
      entityType: "user",
      entityId: user.id,
      detail: `Updated profile (${parsed.data.name})`,
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}

// -- User preferences (notifications / appearance / localization) -----------

export interface PreferenceFormState {
  error?: string;
  ok?: boolean;
}

/**
 * Persist a validated preference group for the current user. The form must
 * include a hidden `group` field naming one of the known preference groups and
 * a `payload` field containing the JSON to validate.
 */
export async function updatePreferences(
  _prev: PreferenceFormState,
  formData: FormData,
): Promise<PreferenceFormState> {
  const user = await requireUser();
  const group = String(formData.get("group") ?? "") as PreferenceGroup;
  if (!(group in PREFERENCE_GROUPS)) return { error: "Unknown preference group" };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Malformed preferences" };
  }

  const { schema, defaults } = PREFERENCE_GROUPS[group];
  const result = schema.safeParse({ ...(defaults as object), ...(payload as object) });
  if (!result.success) return { error: result.error.issues[0]?.message ?? "Invalid preferences" };

  await prisma.userSetting.upsert({
    where: { userId_key: { userId: user.id, key: group } },
    create: { userId: user.id, key: group, value: JSON.stringify(result.data) },
    update: { value: JSON.stringify(result.data) },
  });

  revalidatePath("/settings");
  return { ok: true };
}

/** Read all preference groups for a user as a typed record. */
export async function getUserPreferences(userId: string) {
  const rows = await prisma.userSetting.findMany({ where: { userId } });
  const byKey = new Map(rows.map((r) => [r.key, r.value]));
  const { parsePreferences } = await import("@/lib/domain/user-settings");
  return {
    notifications: parsePreferences("notifications", byKey.get("notifications")),
    appearance: parsePreferences("appearance", byKey.get("appearance")),
    localization: parsePreferences("localization", byKey.get("localization")),
  };
}

// -- Workspace settings (admin) ---------------------------------------------

export interface WorkspaceSettings {
  name: string;
  slug: string;
  description: string;
  sprintLengthDays: number;
  workingDays: string;
  defaultTimezone: string;
  defaultPriority: string;
}

const WORKSPACE_DEFAULTS: WorkspaceSettings = {
  name: "NovaCore Software Inc.",
  slug: "novacore",
  description: "Agile delivery workspace for NovaCore's software engineering organization.",
  sprintLengthDays: 14,
  workingDays: "mon,tue,wed,thu,fri",
  defaultTimezone: "UTC",
  defaultPriority: "medium",
};

const WORKSPACE_KEYS = [
  "workspace.name",
  "workspace.slug",
  "workspace.description",
  "workspace.sprintLengthDays",
  "workspace.workingDays",
  "workspace.defaultTimezone",
  "workspace.defaultPriority",
];

/** Read the current workspace settings, falling back to defaults. */
export async function getWorkspaceSettings(): Promise<WorkspaceSettings> {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: WORKSPACE_KEYS } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const length = Number(map.get("workspace.sprintLengthDays"));
  return {
    name: map.get("workspace.name") ?? WORKSPACE_DEFAULTS.name,
    slug: map.get("workspace.slug") ?? WORKSPACE_DEFAULTS.slug,
    description: map.get("workspace.description") ?? WORKSPACE_DEFAULTS.description,
    sprintLengthDays:
      Number.isFinite(length) && length > 0 ? length : WORKSPACE_DEFAULTS.sprintLengthDays,
    workingDays: map.get("workspace.workingDays") ?? WORKSPACE_DEFAULTS.workingDays,
    defaultTimezone: map.get("workspace.defaultTimezone") ?? WORKSPACE_DEFAULTS.defaultTimezone,
    defaultPriority: map.get("workspace.defaultPriority") ?? WORKSPACE_DEFAULTS.defaultPriority,
  };
}

const workspaceSchema = z.object({
  name: z.string().min(2, "Workspace name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers and hyphens"),
  description: z.string().optional(),
  sprintLengthDays: z.coerce.number().int().min(1, "Sprint length must be at least 1 day").max(60),
  workingDays: z.string().min(1, "Select at least one working day"),
  defaultTimezone: z.string().min(1),
  defaultPriority: z.enum(["low", "medium", "high", "critical"]),
});

export interface WorkspaceFormState {
  error?: string;
  ok?: boolean;
}

/** Update workspace-wide settings. Restricted to workspace managers (admins). */
export async function updateWorkspaceSettings(
  _prev: WorkspaceFormState,
  formData: FormData,
): Promise<WorkspaceFormState> {
  const user = await requireUser();
  if (!can(user.role, "settings.manage_workspace")) {
    return { error: "You cannot manage workspace settings" };
  }

  const parsed = workspaceSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description") || undefined,
    sprintLengthDays: formData.get("sprintLengthDays"),
    workingDays: formData.get("workingDays"),
    defaultTimezone: formData.get("defaultTimezone"),
    defaultPriority: formData.get("defaultPriority"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const entries: [string, string][] = [
    ["workspace.name", parsed.data.name],
    ["workspace.slug", parsed.data.slug],
    ["workspace.description", parsed.data.description ?? ""],
    ["workspace.sprintLengthDays", String(parsed.data.sprintLengthDays)],
    ["workspace.workingDays", parsed.data.workingDays],
    ["workspace.defaultTimezone", parsed.data.defaultTimezone],
    ["workspace.defaultPriority", parsed.data.defaultPriority],
  ];
  for (const [key, value] of entries) {
    await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "workspace_update",
      entityType: "workspace",
      detail: `Updated workspace settings (${parsed.data.name})`,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/admin");
  return { ok: true };
}
