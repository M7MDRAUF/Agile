"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import {
  updateWorkspaceSettings,
  type WorkspaceFormState,
  type WorkspaceSettings,
} from "@/lib/actions/settings";
import { TIMEZONES } from "@/lib/domain/user-settings";
import { PRIORITIES } from "@/lib/domain/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, Label } from "@/components/ui/select";
import { humanize } from "@/lib/utils";
import { ErrorAlert, SavedNote, useSavedToast } from "./_shared";

const WEEKDAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
];

export function WorkspaceSettingsForm({ workspace }: { workspace: WorkspaceSettings }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<WorkspaceFormState, FormData>(
    updateWorkspaceSettings,
    {},
  );
  const saved = useSavedToast(state.ok, () => router.refresh());
  const [days, setDays] = useState<string[]>(workspace.workingDays.split(",").filter(Boolean));

  function toggleDay(key: string) {
    setDays((prev) => (prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]));
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="workingDays" value={days.join(",")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="workspace-name">Workspace name *</Label>
          <Input id="workspace-name" name="name" defaultValue={workspace.name} required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="workspace-slug">Workspace slug *</Label>
          <Input
            id="workspace-slug"
            name="slug"
            defaultValue={workspace.slug}
            pattern="[a-z0-9\-]+"
            required
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="workspace-description">Description</Label>
        <Textarea
          id="workspace-description"
          name="description"
          defaultValue={workspace.description}
          rows={2}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label htmlFor="workspace-sprint-length">Default sprint length (days)</Label>
          <Input
            id="workspace-sprint-length"
            name="sprintLengthDays"
            type="number"
            min={1}
            max={60}
            defaultValue={workspace.sprintLengthDays}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="workspace-timezone">Default timezone</Label>
          <Select
            id="workspace-timezone"
            name="defaultTimezone"
            defaultValue={workspace.defaultTimezone}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="workspace-priority">Default issue priority</Label>
          <Select
            id="workspace-priority"
            name="defaultPriority"
            defaultValue={workspace.defaultPriority}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {humanize(p)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Working days</Label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => (
            <Button
              key={d.key}
              type="button"
              variant={days.includes(d.key) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleDay(d.key)}
            >
              {d.label}
            </Button>
          ))}
        </div>
      </div>

      <ErrorAlert message={state.error} />
      <SavedNote show={saved}>Workspace settings saved.</SavedNote>

      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Save workspace
      </Button>
    </form>
  );
}
