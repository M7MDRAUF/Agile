"use client";

import { useTransition } from "react";
import { assignWorkItem } from "@/lib/actions/work-items";
import { Select } from "@/components/ui/select";

interface Option {
  id: string;
  name: string;
}

export function AssigneeSelect({
  itemId,
  assigneeId,
  users,
}: {
  itemId: string;
  assigneeId: string | null;
  users: Option[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      defaultValue={assigneeId ?? ""}
      disabled={pending}
      aria-label="Assignee"
      className="h-9"
      onChange={(e) => {
        const value = e.target.value;
        startTransition(() => {
          void assignWorkItem(itemId, value || null);
        });
      }}
    >
      <option value="">Unassigned</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>
          {u.name}
        </option>
      ))}
    </Select>
  );
}
