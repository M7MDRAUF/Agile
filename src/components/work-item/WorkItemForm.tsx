"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoaderCircle, AlertCircle } from "lucide-react";
import { createWorkItem, type CreateWorkItemState } from "@/lib/actions/work-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, Label } from "@/components/ui/select";
import { WORK_ITEM_TYPES, PRIORITIES } from "@/lib/domain/constants";
import { humanize } from "@/lib/utils";

interface Option {
  id: string;
  label: string;
  projectId?: string;
}

export function WorkItemForm({
  projects,
  users,
  epics,
  sprints,
}: {
  projects: Option[];
  users: Option[];
  epics: Option[];
  sprints: Option[];
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<CreateWorkItemState, FormData>(
    createWorkItem,
    {},
  );

  useEffect(() => {
    if (state.ok) router.push("/work-items");
  }, [state.ok, router]);

  const fieldErrors = state.fieldErrors ?? {};

  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          placeholder="Short, descriptive title"
          required
          aria-invalid={fieldErrors.title ? true : undefined}
          aria-describedby={fieldErrors.title ? "title-error" : undefined}
        />
        {fieldErrors.title ? (
          <p id="title-error" className="text-xs text-destructive">
            {fieldErrors.title}
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Context, scope and details"
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="type">Type *</Label>
          <Select id="type" name="type" defaultValue="story" required>
            {WORK_ITEM_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="priority">Priority *</Label>
          <Select id="priority" name="priority" defaultValue="medium" required>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {humanize(p)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="projectId">Project *</Label>
          <Select
            id="projectId"
            name="projectId"
            required
            aria-invalid={fieldErrors.projectId ? true : undefined}
            aria-describedby={fieldErrors.projectId ? "projectId-error" : undefined}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
          {fieldErrors.projectId ? (
            <p id="projectId-error" className="text-xs text-destructive">
              {fieldErrors.projectId}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="assigneeId">Assignee</Label>
          <Select id="assigneeId" name="assigneeId" defaultValue="">
            <option value="">Unassigned</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="epicId">Epic</Label>
          <Select id="epicId" name="epicId" defaultValue="">
            <option value="">None</option>
            {epics.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sprintId">Sprint</Label>
          <Select id="sprintId" name="sprintId" defaultValue="">
            <option value="">Backlog (no sprint)</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="storyPoints">Story Points</Label>
          <Input id="storyPoints" name="storyPoints" type="number" min={0} max={100} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="acceptanceCriteria">Acceptance Criteria</Label>
        <Textarea
          id="acceptanceCriteria"
          name="acceptanceCriteria"
          rows={3}
          placeholder="Given / When / Then"
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          aria-live="assertive"
          className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertCircle className="size-4" />
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          Create work item
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
