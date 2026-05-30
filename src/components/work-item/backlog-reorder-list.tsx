"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronUp, ChevronDown, LoaderCircle, GripVertical } from "lucide-react";
import { reorderBacklog } from "@/lib/actions/work-items";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/status-badge";
import { WorkItemTypeIcon } from "@/components/work-item/type-icon";

export interface BacklogItem {
  id: string;
  title: string;
  type: string;
  priority: string;
  storyPoints: number | null;
  epicTitle: string | null;
  assigneeName: string | null;
  assigneeColor: string | null;
}

/**
 * Interactive, keyboard-accessible backlog reordering (BUG-H08). Users with
 * `backlog.prioritize` can move items up/down; the new order is persisted to
 * each item's `rank` via the `reorderBacklog` server action.
 */
export function BacklogReorderList({
  projectId,
  items,
}: {
  projectId: string;
  items: BacklogItem[];
}) {
  const [order, setOrder] = useState<BacklogItem[]>(items);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setDirty(true);
    setError(null);
  }

  function save() {
    setError(null);
    startSaving(async () => {
      const res = await reorderBacklog(
        projectId,
        order.map((i) => i.id),
      );
      if (res.error) {
        setError(res.error);
      } else {
        setDirty(false);
      }
    });
  }

  function reset() {
    setOrder(items);
    setDirty(false);
    setError(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between" aria-live="polite">
        <p className="text-xs text-muted-foreground">
          {dirty ? "Unsaved order changes" : "Use the arrows to reprioritize items."}
        </p>
        <div className="flex items-center gap-2">
          {dirty ? (
            <Button variant="ghost" size="sm" onClick={reset} disabled={saving}>
              Reset
            </Button>
          ) : null}
          <Button size="sm" onClick={save} disabled={!dirty || saving}>
            {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
            Save order
          </Button>
        </div>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <ul className="space-y-2">
        {order.map((i, idx) => (
          <li
            key={i.id}
            className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
          >
            <span className="w-6 text-right text-xs text-muted-foreground tabular-nums">
              {idx + 1}
            </span>
            <GripVertical className="size-4 text-muted-foreground" aria-hidden />
            <WorkItemTypeIcon type={i.type} />
            <Link href={`/work-items/${i.id}`} className="min-w-0 flex-1 hover:underline">
              <p className="truncate text-sm font-medium">{i.title}</p>
              {i.epicTitle ? (
                <span className="text-xs text-muted-foreground">{i.epicTitle}</span>
              ) : null}
            </Link>
            <PriorityBadge priority={i.priority} />
            <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
              {i.storyPoints ?? "—"} pt
            </span>
            {i.assigneeName ? (
              <Avatar name={i.assigneeName} color={i.assigneeColor} size={24} />
            ) : (
              <span className="w-6" />
            )}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0 || saving}
                aria-label={`Move ${i.title} up`}
                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
              >
                <ChevronUp className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === order.length - 1 || saving}
                aria-label={`Move ${i.title} down`}
                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
              >
                <ChevronDown className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
