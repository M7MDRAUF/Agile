"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, AlertCircle } from "lucide-react";
import { createSprint, type SprintFormState } from "@/lib/actions/sprints";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, Label } from "@/components/ui/select";

interface Option {
  id: string;
  label: string;
}

export function SprintForm({ projects }: { projects: Option[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<SprintFormState, FormData>(createSprint, {});

  useEffect(() => {
    if (state.ok && state.id) router.push(`/sprints/${state.id}`);
  }, [state.ok, state.id, router]);

  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Sprint name *</Label>
        <Input id="name" name="name" placeholder="e.g. Sprint 14 — Checkout polish" required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="projectId">Project *</Label>
        <Select id="projectId" name="projectId" required>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="goal">Sprint goal</Label>
        <Textarea
          id="goal"
          name="goal"
          rows={3}
          placeholder="What outcome should this sprint deliver?"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endDate">End date</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="capacity">Capacity (points)</Label>
          <Input id="capacity" name="capacity" type="number" min={0} max={1000} />
        </div>
      </div>

      {state.error ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle className="size-4" />
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          Create sprint
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
