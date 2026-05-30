import Link from "next/link";
import {
  BOARD_COLUMNS,
  WORK_ITEM_STATUS_LABELS,
  type WorkItemStatus,
} from "@/lib/domain/constants";
import { cn, humanize } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge } from "@/components/status-badge";
import { StatusSelect } from "@/components/work-item/StatusSelect";
import { WorkItemTypeIcon } from "@/components/work-item/type-icon";

export interface BoardItem {
  id: string;
  key: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  storyPoints: number | null;
  assignee: { name: string; avatarColor: string } | null;
}

export function Board({
  items,
  columns = BOARD_COLUMNS,
}: {
  items: BoardItem[];
  columns?: readonly string[];
}) {
  return (
    <>
      <div className="flex gap-4 overflow-x-auto scroll-smooth pb-4">
        {columns.map((col) => {
          const isCanceled = col === "canceled";
          const colItems = items.filter((i) => i.status === col);
          return (
            <div
              key={col}
              className={cn(
                "flex w-72 shrink-0 flex-col rounded-lg p-2",
                isCanceled ? "bg-muted/20" : "bg-muted/40",
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className={cn("text-sm font-semibold", isCanceled && "text-muted-foreground")}>
                  {WORK_ITEM_STATUS_LABELS[col as WorkItemStatus] ?? humanize(col)}
                </h2>
                <span className="rounded-full bg-muted px-2 text-xs text-muted-foreground">
                  {colItems.length}
                </span>
              </div>
              <ul role="list" className="flex flex-col gap-2">
                {colItems.map((i) => (
                  <li
                    key={i.id}
                    className={cn(
                      "rounded-md border border-border bg-card p-3 shadow-sm",
                      isCanceled && "opacity-60",
                    )}
                  >
                    <Link
                      href={`/work-items/${i.id}`}
                      className="flex items-start gap-2 hover:underline"
                    >
                      <WorkItemTypeIcon type={i.type} />
                      <span className="line-clamp-2 text-sm font-medium">{i.title}</span>
                    </Link>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-xs text-muted-foreground">{i.key}</span>
                      <PriorityBadge priority={i.priority} />
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <StatusSelect
                        itemId={i.id}
                        itemTitle={i.title}
                        status={i.status}
                        className="h-7 text-xs"
                      />
                      {i.assignee ? (
                        <Avatar name={i.assignee.name} color={i.assignee.avatarColor} size={22} />
                      ) : null}
                    </div>
                  </li>
                ))}
                {colItems.length === 0 ? (
                  <li className="px-1 py-4 text-center text-xs text-muted-foreground">No items</li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground md:hidden" aria-hidden="true">
        ← Scroll to see all columns →
      </p>
    </>
  );
}
