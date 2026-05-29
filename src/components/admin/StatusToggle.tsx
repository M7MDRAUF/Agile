"use client";

import { useTransition } from "react";
import { toggleUserStatus } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export function StatusToggle({ userId, status }: { userId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant={status === "active" ? "outline" : "secondary"}
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          void toggleUserStatus(userId);
        })
      }
    >
      {status === "active" ? "Deactivate" : "Activate"}
    </Button>
  );
}
