"use client";

import { useTransition } from "react";
import { Select } from "@/components/ui/select";
import { WORK_ITEM_STATUSES } from "@/lib/domain/constants";
import { humanize } from "@/lib/utils";
import { updateWorkItemStatus } from "@/lib/actions/work-items";

export function StatusSelect({
  itemId,
  itemTitle,
  status,
  className,
}: {
  itemId: string;
  itemTitle?: string;
  status: string;
  className?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      aria-label={`Update status for ${itemTitle ?? itemId}`}
      defaultValue={status}
      disabled={pending}
      className={className}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          await updateWorkItemStatus(itemId, next);
        });
      }}
    >
      {WORK_ITEM_STATUSES.map((s) => (
        <option key={s} value={s}>
          {humanize(s)}
        </option>
      ))}
    </Select>
  );
}
