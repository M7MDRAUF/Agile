"use client";

import { useTransition } from "react";
import { changeUserRole } from "@/lib/actions/admin";
import { Select } from "@/components/ui/select";
import { ROLES, ROLE_LABELS } from "@/lib/domain/constants";

export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Select
      defaultValue={role}
      disabled={pending}
      aria-label="User role"
      className="h-8 min-w-[9rem] text-xs"
      onChange={(e) => {
        const next = e.target.value;
        startTransition(() => {
          void changeUserRole(userId, next);
        });
      }}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABELS[r]}
        </option>
      ))}
    </Select>
  );
}
