"use client";

import { useState, useTransition } from "react";
import { Select } from "@/components/ui/select";
import { WORK_ITEM_STATUSES, WORK_ITEM_STATUS_LABELS } from "@/lib/domain/constants";
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
  // Controlled so we can roll back on a rejected transition (BUG-L11).
  const [value, setValue] = useState(status);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const label = `Update status for ${itemTitle ?? itemId}`;

  return (
    <span className="inline-flex flex-col gap-1">
      <Select
        aria-label={label}
        value={value}
        disabled={pending}
        aria-busy={pending}
        className={className}
        onChange={(e) => {
          const next = e.target.value;
          const previous = value;
          setValue(next);
          setMessage(null);
          startTransition(async () => {
            // BUG-L11 — honor the action result instead of silently ignoring it.
            const result = await updateWorkItemStatus(itemId, next);
            if (result && "error" in result && result.error) {
              setValue(previous);
              setMessage({ tone: "error", text: result.error });
            } else if (!result) {
              // Unexpected null/undefined result — treat as failure.
              setValue(previous);
              setMessage({ tone: "error", text: "Failed to update status. Please try again." });
            } else {
              setMessage({ tone: "success", text: `Status updated to ${humanize(next)}.` });
            }
          });
        }}
      >
        {WORK_ITEM_STATUSES.map((s) => (
          <option key={s} value={s}>
            {WORK_ITEM_STATUS_LABELS[s] ?? humanize(s)}
          </option>
        ))}
      </Select>
      {/* BUG-M23 — announce the outcome to assistive technology. */}
      <span
        role="status"
        aria-live="polite"
        className={
          message
            ? message.tone === "error"
              ? "text-xs text-destructive"
              : "text-xs text-muted-foreground"
            : "sr-only"
        }
      >
        {message?.text ?? ""}
      </span>
    </span>
  );
}
