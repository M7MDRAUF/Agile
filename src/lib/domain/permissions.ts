import type { Role } from "./constants";

// Capability-based RBAC. Each role maps to a set of permissions; the `can`
// helper is a pure function so it can be unit tested and reused on both the
// server (route/action guards) and client (conditional UI).

export const PERMISSIONS = [
  "admin.access",
  "audit.view",
  "user.manage",
  "user.view",
  "team.manage",
  "team.view",
  "project.create",
  "project.edit",
  "project.view",
  "workitem.create",
  "workitem.edit_any",
  "workitem.edit_assigned",
  "workitem.view",
  "backlog.prioritize",
  "sprint.manage",
  "sprint.view",
  "board.move",
  "blocker.create",
  "blocker.resolve",
  "comment.create",
  "qa.manage",
  "qa.view",
  "report.view",
  "notification.view",
  "settings.manage_workspace",
  "settings.manage_profile",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

const COMMON: Permission[] = [
  "project.view",
  "workitem.view",
  "sprint.view",
  "team.view",
  "user.view",
  "qa.view",
  "report.view",
  "notification.view",
  "settings.manage_profile",
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ALL,
  engineering_manager: [
    ...COMMON,
    "team.manage",
    "project.create",
    "project.edit",
    "workitem.create",
    "workitem.edit_any",
    "sprint.manage",
    "board.move",
    "blocker.create",
    "blocker.resolve",
    "comment.create",
    "report.view",
  ],
  product_owner: [
    ...COMMON,
    "project.edit",
    "workitem.create",
    "workitem.edit_any",
    "backlog.prioritize",
    "comment.create",
    "blocker.create",
    "board.move",
  ],
  scrum_master: [
    ...COMMON,
    "sprint.manage",
    "board.move",
    "workitem.create",
    "workitem.edit_any",
    "blocker.create",
    "blocker.resolve",
    "comment.create",
  ],
  engineer: [
    ...COMMON,
    "workitem.create",
    "workitem.edit_assigned",
    "board.move",
    "blocker.create",
    "comment.create",
  ],
  qa: [
    ...COMMON,
    "qa.manage",
    "workitem.create",
    "workitem.edit_assigned",
    "blocker.create",
    "comment.create",
    "board.move",
  ],
  designer: [...COMMON, "workitem.edit_assigned", "comment.create", "board.move"],
  stakeholder: ["project.view", "report.view", "notification.view", "settings.manage_profile"],
};

/** Returns true if the given role has the requested permission. */
export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Returns every permission granted to a role (useful for UI/debugging). */
export function permissionsFor(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Whether a user may edit a specific work item, accounting for the
 * "edit only assigned" capability granted to individual contributors.
 */
export function canEditWorkItem(
  role: Role,
  opts: { assigneeId?: string | null; reporterId?: string | null; userId: string },
): boolean {
  if (can(role, "workitem.edit_any")) return true;
  if (!can(role, "workitem.edit_assigned")) return false;
  return opts.assigneeId === opts.userId || opts.reporterId === opts.userId;
}
