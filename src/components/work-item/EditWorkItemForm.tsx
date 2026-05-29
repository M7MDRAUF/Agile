"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, AlertCircle } from "lucide-react";
import { updateWorkItem, type UpdateWorkItemState } from "@/lib/actions/work-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, Label } from "@/components/ui/select";
import { WORK_ITEM_TYPES, PRIORITIES } from "@/lib/domain/constants";
import { humanize } from "@/lib/utils";

interface Option {
  id: string;
  label: string;
}

export interface EditWorkItemValues {
  id: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  acceptanceCriteria: string;
  epicId: string;
  sprintId: string;
  storyPoints: number | null;
  dueDate: string;
}

export function EditWorkItemForm({
  item,
  epics,
  sprints,
}: {
  item: EditWorkItemValues;
  epics: Option[];
  sprints: Option[];
}) {
  const router = useRouter();
  const boundAction = updateWorkItem.bind(null, item.id);
  const [state, action, pending] = useActionState<UpdateWorkItemState, FormData>(boundAction, {});

  useEffect(() => {
    if (state.ok) router.push(`/work-items/${item.id}`);
  }, [state.ok, router, item.id]);

  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" defaultValue={item.title} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={item.description} rows={4} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="type">Type *</Label>
          <Select id="type" name="type" defaultValue={item.type} required>
            {WORK_ITEM_TYPES.map((t) => (
              <option key={t} value={t}>
                {humanize(t)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="priority">Priority *</Label>
          <Select id="priority" name="priority" defaultValue={item.priority} required>
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
          <Label htmlFor="epicId">Epic</Label>
          <Select id="epicId" name="epicId" defaultValue={item.epicId}>
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
          <Select id="sprintId" name="sprintId" defaultValue={item.sprintId}>
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
          <Input
            id="storyPoints"
            name="storyPoints"
            type="number"
            min={0}
            max={100}
            defaultValue={item.storyPoints ?? ""}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" defaultValue={item.dueDate} />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="acceptanceCriteria">Acceptance Criteria</Label>
        <Textarea
          id="acceptanceCriteria"
          name="acceptanceCriteria"
          rows={3}
          defaultValue={item.acceptanceCriteria}
          placeholder="Given / When / Then"
        />
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
          Save changes
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
