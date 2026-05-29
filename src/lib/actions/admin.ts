"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/domain/permissions";
import { ROLES, type Role } from "@/lib/domain/constants";
import { hashPassword } from "@/lib/auth/password";

const roleSchema = z.enum(ROLES as unknown as [Role, ...Role[]]);

const AVATAR_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

const createUserSchema = z.object({
  email: z.string().email("Enter a valid email"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: roleSchema,
  title: z.string().optional(),
});

export interface CreateUserState {
  error?: string;
  ok?: boolean;
  id?: string;
}

/** Create a new workspace user (admin only). */
export async function createUser(
  _prev: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const actor = await requireUser();
  if (!can(actor.role, "user.manage")) return { error: "Not permitted" };

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
    role: formData.get("role"),
    title: formData.get("title") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (existing) return { error: "A user with that email already exists" };

  const passwordHash = await hashPassword(parsed.data.password);
  const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

  const created = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      name: parsed.data.name,
      passwordHash,
      role: parsed.data.role,
      title: parsed.data.title || null,
      avatarColor: color,
      status: "active",
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "user_create",
      entityType: "user",
      entityId: created.id,
      detail: `Created user ${created.email} with role ${created.role}`,
    },
  });

  revalidatePath("/users");
  revalidatePath("/admin");
  return { ok: true, id: created.id };
}

/** Change a user's role (admin only). */
export async function changeUserRole(userId: string, role: string) {
  const actor = await requireUser();
  if (!can(actor.role, "admin.access")) return { error: "Not permitted" };
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return { error: "Invalid role" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found" };

  // SEC-013: bump sessionVersion so existing JWTs are invalidated on next use.
  await prisma.user.update({
    where: { id: userId },
    data: { role: parsed.data, sessionVersion: { increment: 1 } },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "role_change",
      entityType: "user",
      entityId: userId,
      detail: `Changed role from ${target.role} to ${parsed.data}`,
    },
  });
  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  revalidatePath("/admin");
  return { ok: true };
}

/** Toggle a user's active status (admin only). */
export async function toggleUserStatus(userId: string) {
  const actor = await requireUser();
  if (!can(actor.role, "admin.access")) return { error: "Not permitted" };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found" };
  if (target.id === actor.id) return { error: "You cannot deactivate yourself" };

  const next = target.status === "active" ? "inactive" : "active";
  // SEC-013: bump sessionVersion on deactivation so existing sessions stop working.
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: next,
      ...(next === "inactive" ? { sessionVersion: { increment: 1 } } : {}),
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: "status_change",
      entityType: "user",
      entityId: userId,
      detail: `Set status to ${next}`,
    },
  });
  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
  revalidatePath("/admin");
  return { ok: true };
}
