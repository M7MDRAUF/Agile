import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { can, type Permission } from "@/lib/domain/permissions";
import { isRole, type Role } from "@/lib/domain/constants";

export interface AuthedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string | null;
  title: string | null;
}

/** Returns the authenticated user (redirecting to /login if absent). */
export async function requireUser(): Promise<AuthedUser> {
  const user = await getCurrentUser();
  if (!user || !isRole(user.role)) redirect("/login");
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as Role,
    avatarColor: user.avatarColor,
    title: user.title,
  };
}

/**
 * Returns the authenticated user, redirecting to the dashboard when the user
 * lacks the required permission. Used to gate whole pages.
 */
export async function requirePermission(permission: Permission): Promise<AuthedUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect("/dashboard");
  return user;
}
