import { DONE_STATUSES, type Priority, type WorkItemStatus } from "./constants";

// Pure, dependency-free domain calculations. Everything here is unit tested
// (see src/lib/domain/__tests__/metrics.test.ts) and reused by reports,
// dashboards and project health badges.

export interface MetricWorkItem {
  status: WorkItemStatus | string;
  storyPoints?: number | null;
  priority?: Priority | string;
  dueDate?: Date | null;
  createdAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  type?: string;
}

export interface SprintProgress {
  totalPoints: number;
  completedPoints: number;
  totalItems: number;
  completedItems: number;
  percentComplete: number;
}

export function isDone(status: string): boolean {
  return (DONE_STATUSES as string[]).includes(status);
}

/** Aggregate completion of a sprint by story points and item count. */
export function sprintProgress(items: MetricWorkItem[]): SprintProgress {
  const totalPoints = items.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
  const completedPoints = items
    .filter((i) => isDone(i.status))
    .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);
  const totalItems = items.length;
  const completedItems = items.filter((i) => isDone(i.status)).length;
  const percentComplete =
    totalPoints > 0
      ? Math.round((completedPoints / totalPoints) * 100)
      : totalItems > 0
        ? Math.round((completedItems / totalItems) * 100)
        : 0;
  return { totalPoints, completedPoints, totalItems, completedItems, percentComplete };
}

export interface BurndownPoint {
  day: number;
  date: string;
  ideal: number;
  remaining: number;
}

/**
 * Build a burndown series. `ideal` decreases linearly from total to zero;
 * `remaining` reflects points not yet completed on each day.
 */
export function burndown(
  totalPoints: number,
  start: Date,
  end: Date,
  completions: { date: Date; points: number }[],
): BurndownPoint[] {
  const msPerDay = 86_400_000;
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / msPerDay));
  const points: BurndownPoint[] = [];
  for (let day = 0; day <= days; day++) {
    const dayDate = new Date(start.getTime() + day * msPerDay);
    const burned = completions
      .filter((c) => c.date.getTime() <= dayDate.getTime())
      .reduce((sum, c) => sum + c.points, 0);
    points.push({
      day,
      date: dayDate.toISOString().slice(0, 10),
      ideal: Math.round((totalPoints - (totalPoints / days) * day) * 10) / 10,
      remaining: Math.max(0, totalPoints - burned),
    });
  }
  return points;
}

/** Average completed story points across past sprints. */
export function velocity(sprintPointTotals: number[]): number {
  if (sprintPointTotals.length === 0) return 0;
  const sum = sprintPointTotals.reduce((a, b) => a + b, 0);
  return Math.round((sum / sprintPointTotals.length) * 10) / 10;
}

/**
 * Average days between when work started and when it completed (cycle time).
 * Prefers an explicit `startedAt` (e.g. the first "in progress" transition);
 * falls back to `createdAt` when no start marker is available.
 */
export function cycleTimeDays(items: MetricWorkItem[]): number {
  const finished = items.filter((i) => i.completedAt && (i.startedAt ?? i.createdAt));
  if (finished.length === 0) return 0;
  const total = finished.reduce((sum, i) => {
    const start = (i.startedAt ?? i.createdAt)!;
    const days = (i.completedAt!.getTime() - start.getTime()) / 86_400_000;
    return sum + Math.max(0, days);
  }, 0);
  return Math.round((total / finished.length) * 10) / 10;
}

/**
 * Average days between when work was created (requested) and when it was
 * completed (lead time). Always measured from `createdAt`.
 */
export function leadTimeDays(items: MetricWorkItem[]): number {
  const finished = items.filter((i) => i.completedAt && i.createdAt);
  if (finished.length === 0) return 0;
  const total = finished.reduce((sum, i) => {
    const days = (i.completedAt!.getTime() - i.createdAt!.getTime()) / 86_400_000;
    return sum + Math.max(0, days);
  }, 0);
  return Math.round((total / finished.length) * 10) / 10;
}

export interface HealthInput {
  items: MetricWorkItem[];
  openBlockers: number;
  now?: Date;
}

/**
 * Derive a project's health from overdue work, open blockers, critical bugs
 * and overall completion. Returns a status plus a 0-100 score and reasons.
 */
export function projectHealth(input: HealthInput): {
  health: "on_track" | "at_risk" | "off_track";
  score: number;
  reasons: string[];
} {
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  let score = 100;

  const overdue = input.items.filter(
    (i) => i.dueDate && i.dueDate.getTime() < now.getTime() && !isDone(i.status),
  ).length;
  if (overdue > 0) {
    score -= Math.min(30, overdue * 6);
    reasons.push(`${overdue} overdue work item${overdue === 1 ? "" : "s"}`);
  }

  if (input.openBlockers > 0) {
    score -= Math.min(30, input.openBlockers * 10);
    reasons.push(`${input.openBlockers} open blocker${input.openBlockers === 1 ? "" : "s"}`);
  }

  const criticalBugs = input.items.filter(
    (i) => i.type === "bug" && i.priority === "critical" && !isDone(i.status),
  ).length;
  if (criticalBugs > 0) {
    score -= Math.min(25, criticalBugs * 12);
    reasons.push(`${criticalBugs} critical bug${criticalBugs === 1 ? "" : "s"}`);
  }

  const active = input.items.filter((i) => i.status !== "canceled");
  const completion = sprintProgress(active).percentComplete;
  if (completion < 25 && active.length > 8) {
    score -= 10;
    reasons.push("Low completion rate");
  }

  score = Math.max(0, Math.min(100, score));
  const health = score >= 75 ? "on_track" : score >= 50 ? "at_risk" : "off_track";
  if (reasons.length === 0) reasons.push("No risks detected");
  return { health, score, reasons };
}

/** Count work items grouped by an arbitrary string key. */
export function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

/** Days a blocker has been open (rounded down). */
export function blockerAgeDays(createdAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 86_400_000));
}
