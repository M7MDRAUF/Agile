"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, LoaderCircle, AlertCircle } from "lucide-react";
import { setWorkItemSprint } from "@/lib/actions/sprints";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";

export interface SprintCandidate {
  id: string;
  key: string;
  title: string;
  type: string;
  priority: string;
  storyPoints: number | null;
}

interface AddSprintItemsProps {
  sprintId: string;
  candidates: SprintCandidate[];
}

export function AddSprintItems({ sprintId, candidates }: AddSprintItemsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addItem(itemId: string) {
    setError(null);
    setPendingId(itemId);
    startTransition(async () => {
      const result = await setWorkItemSprint(itemId, sprintId);
      setPendingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <Plus className="size-4" />
          Add items
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          <AlertCircle className="size-4" />
          {error}
        </p>
      ) : null}

      {open ? (
        <div className="rounded-md border border-border p-3">
          {candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No unscheduled backlog items in this project.
            </p>
          ) : (
            <ul className="space-y-2">
              {candidates.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
                >
                  <span className="font-mono text-xs text-muted-foreground">{c.key}</span>
                  <span className="flex-1 truncate text-sm font-medium">{c.title}</span>
                  <Badge variant="muted">{humanize(c.type)}</Badge>
                  <Badge variant="muted">{humanize(c.priority)}</Badge>
                  {c.storyPoints != null ? (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {c.storyPoints} pts
                    </span>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addItem(c.id)}
                    disabled={isPending && pendingId === c.id}
                    aria-label={`Add ${c.key} to sprint`}
                  >
                    {isPending && pendingId === c.id ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
