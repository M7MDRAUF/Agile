"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, CheckCircle2, LoaderCircle } from "lucide-react";
import { startSprint, completeSprint } from "@/lib/actions/sprints";
import { Button } from "@/components/ui/button";

export function SprintControls({ sprintId, status }: { sprintId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (status === "completed") return null;

  return (
    <div className="flex items-center gap-2">
      {status === "planned" ? (
        <Button
          size="sm"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await startSprint(sprintId);
              if (res?.error) setError(res.error);
              else router.refresh();
            });
          }}
        >
          {pending ? <LoaderCircle className="animate-spin" /> : <Play className="size-4" />}
          Start sprint
        </Button>
      ) : null}
      {status === "active" ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await completeSprint(sprintId);
              if (res?.error) setError(res.error);
              else router.refresh();
            });
          }}
        >
          {pending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Complete sprint
        </Button>
      ) : null}
      {error ? <span className="text-sm text-destructive">{error}</span> : null}
    </div>
  );
}
