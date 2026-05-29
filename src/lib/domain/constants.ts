// Enum-like domain constants. SQLite has no native enums, so these string
// unions are the single source of truth used across UI, validation and seed.

export const ROLES = [
  "admin",
  "engineering_manager",
  "product_owner",
  "scrum_master",
  "engineer",
  "qa",
  "designer",
  "stakeholder",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "System Admin",
  engineering_manager: "Engineering Manager",
  product_owner: "Product Owner",
  scrum_master: "Scrum Master",
  engineer: "Software Engineer",
  qa: "QA Engineer",
  designer: "Designer",
  stakeholder: "Executive / Stakeholder",
};

export const WORK_ITEM_TYPES = ["epic", "story", "task", "bug", "subtask"] as const;
export type WorkItemType = (typeof WORK_ITEM_TYPES)[number];

export const WORK_ITEM_STATUSES = [
  "backlog",
  "ready",
  "in_progress",
  "in_review",
  "qa",
  "blocked",
  "done",
  "canceled",
] as const;
export type WorkItemStatus = (typeof WORK_ITEM_STATUSES)[number];

/** Statuses that count as completed work for metrics. */
export const DONE_STATUSES: WorkItemStatus[] = ["done"];

/** Board column ordering for Scrum/Kanban views. */
export const BOARD_COLUMNS: WorkItemStatus[] = [
  "backlog",
  "ready",
  "in_progress",
  "in_review",
  "qa",
  "blocked",
  "done",
  "canceled",
];

export const PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_HEALTH = ["on_track", "at_risk", "off_track"] as const;
export type ProjectHealth = (typeof PROJECT_HEALTH)[number];

export const SPRINT_STATUSES = ["planned", "active", "completed"] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export const TEST_STATUSES = ["not_run", "passed", "failed", "blocked"] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  "assignment",
  "comment",
  "blocker",
  "sprint",
  "mention",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
