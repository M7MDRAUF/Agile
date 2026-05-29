import { Badge, type BadgeProps } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";

type Variant = NonNullable<BadgeProps["variant"]>;

const STATUS_VARIANT: Record<string, Variant> = {
  backlog: "muted",
  ready: "info",
  in_progress: "info",
  in_review: "warning",
  qa: "warning",
  blocked: "danger",
  done: "success",
  canceled: "muted",
};

const PRIORITY_VARIANT: Record<string, Variant> = {
  low: "muted",
  medium: "info",
  high: "warning",
  critical: "danger",
};

const HEALTH_VARIANT: Record<string, Variant> = {
  on_track: "success",
  at_risk: "warning",
  off_track: "danger",
};

const TEST_VARIANT: Record<string, Variant> = {
  not_run: "muted",
  passed: "success",
  failed: "danger",
  blocked: "warning",
};

const SPRINT_VARIANT: Record<string, Variant> = {
  planned: "muted",
  active: "info",
  completed: "success",
};

export function StatusBadge({ status }: { status: string }) {
  return <Badge variant={STATUS_VARIANT[status] ?? "secondary"}>{humanize(status)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <Badge variant={PRIORITY_VARIANT[priority] ?? "secondary"}>{humanize(priority)}</Badge>;
}

export function HealthBadge({ health }: { health: string }) {
  return <Badge variant={HEALTH_VARIANT[health] ?? "secondary"}>{humanize(health)}</Badge>;
}

export function TestStatusBadge({ status }: { status: string }) {
  return <Badge variant={TEST_VARIANT[status] ?? "secondary"}>{humanize(status)}</Badge>;
}

export function SprintStatusBadge({ status }: { status: string }) {
  return <Badge variant={SPRINT_VARIANT[status] ?? "secondary"}>{humanize(status)}</Badge>;
}
