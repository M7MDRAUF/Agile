// Enum-like domain constants. SQLite has no native enums, so these string
// unions are the single source of truth used across UI, validation and seed.

// PERF / BUG-M06: query bounds. `LIST_PAGE_LIMIT` caps user-facing list renders
// (backlog, board, QA) so a single page never tries to materialise an unbounded
// result set. `METRICS_SCAN_LIMIT` is a higher guardrail for analytics scans
// (reports, dashboard) that aggregate over many rows; it protects against a
// runaway full-table scan while staying well above realistic workspace sizes.
export const LIST_PAGE_LIMIT = 200;
export const METRICS_SCAN_LIMIT = 5000;

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

// BUG-M20 / BUG-M19: external links attached to a work item. "pr" supports the
// engineer pull-request workflow; "figma"/"design" support the designer
// workflow; "doc"/"other" are generic.
export const WORK_ITEM_LINK_TYPES = ["pr", "figma", "design", "doc", "other"] as const;
export type WorkItemLinkType = (typeof WORK_ITEM_LINK_TYPES)[number];

export const WORK_ITEM_LINK_LABELS: Record<WorkItemLinkType, string> = {
  pr: "Pull Request",
  figma: "Figma",
  design: "Design",
  doc: "Document",
  other: "Link",
};

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

/**
 * Allowed work-item status transitions (M12 / BE-006). A move to the same
 * status is always a no-op and permitted. Terminal states (`done`, `canceled`)
 * may be reopened back into the active flow.
 */
export const WORK_ITEM_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  backlog: ["ready", "in_progress", "blocked", "canceled"],
  ready: ["backlog", "in_progress", "blocked", "canceled"],
  in_progress: ["backlog", "ready", "in_review", "qa", "blocked", "done", "canceled"],
  in_review: ["in_progress", "qa", "blocked", "done", "canceled"],
  qa: ["in_progress", "in_review", "blocked", "done", "canceled"],
  blocked: ["backlog", "ready", "in_progress", "in_review", "qa", "canceled"],
  done: ["in_progress", "backlog"],
  canceled: ["backlog", "ready"],
};

/** Whether a work item may move from `from` to `to`. */
export function isValidStatusTransition(from: string, to: string): boolean {
  if (from === to) return true;
  const allowed = WORK_ITEM_TRANSITIONS[from as WorkItemStatus];
  return allowed ? allowed.includes(to as WorkItemStatus) : false;
}

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

export const WORK_ITEM_STATUS_LABELS: Record<WorkItemStatus, string> = {
  backlog: "Backlog",
  ready: "Ready",
  in_progress: "In Progress",
  in_review: "In Review",
  qa: "QA",
  blocked: "Blocked",
  done: "Done",
  canceled: "Canceled",
};

export const PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PROJECT_STATUSES = ["active", "on_hold", "completed", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_HEALTH = ["on_track", "at_risk", "off_track"] as const;
export type ProjectHealth = (typeof PROJECT_HEALTH)[number];

export const RISK_SEVERITIES = ["low", "medium", "high"] as const;
export type RiskSeverity = (typeof RISK_SEVERITIES)[number];

export const RISK_STATUSES = ["open", "mitigated", "closed"] as const;
export type RiskStatus = (typeof RISK_STATUSES)[number];

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
