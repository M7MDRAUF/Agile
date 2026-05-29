import { Bug, Bookmark, CheckSquare, Layers, GitBranch } from "lucide-react";

const MAP: Record<string, { icon: typeof Bug; color: string; label: string }> = {
  epic: { icon: Layers, color: "#8b5cf6", label: "Epic" },
  story: { icon: Bookmark, color: "#16a34a", label: "Story" },
  task: { icon: CheckSquare, color: "#0ea5e9", label: "Task" },
  bug: { icon: Bug, color: "#dc2626", label: "Bug" },
  subtask: { icon: GitBranch, color: "#64748b", label: "Subtask" },
};

export function WorkItemTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const entry = MAP[type] ?? MAP.task;
  const Icon = entry.icon;
  return (
    <Icon style={{ color: entry.color }} width={size} height={size} aria-label={entry.label} />
  );
}

export function workItemTypeLabel(type: string): string {
  return MAP[type]?.label ?? type;
}
