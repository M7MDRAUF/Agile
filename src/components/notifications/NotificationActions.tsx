"use client";

import { useTransition } from "react";
import { Check, CheckCheck } from "lucide-react";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";

export function MarkAllRead() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          void markAllNotificationsRead();
        })
      }
    >
      <CheckCheck className="size-4" /> Mark all read
    </Button>
  );
}

export function MarkOneRead({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      aria-label="Mark as read"
      disabled={pending}
      className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
      onClick={() =>
        startTransition(() => {
          void markNotificationRead(id);
        })
      }
    >
      <Check className="size-4" />
    </button>
  );
}
