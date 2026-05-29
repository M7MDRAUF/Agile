"use client";

import { useState, useTransition } from "react";
import { ShieldAlert, Check } from "lucide-react";
import { createBlocker, resolveBlocker } from "@/lib/actions/work-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateBlocker({ itemId }: { itemId: string }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ShieldAlert className="size-4" /> Raise blocker
      </Button>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await createBlocker(itemId, reason);
          if (res?.error) setError(res.error);
          else {
            setReason("");
            setOpen(false);
          }
        });
      }}
      className="flex flex-col gap-2"
    >
      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Describe the blocker…"
        aria-label="Blocker reason"
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={pending || !reason.trim()}>
          Add blocker
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function ResolveBlocker({ blockerId }: { blockerId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(() => {
          void resolveBlocker(blockerId);
        })
      }
    >
      <Check className="size-4" /> Resolve
    </Button>
  );
}
