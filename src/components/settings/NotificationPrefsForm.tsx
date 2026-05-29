"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { updatePreferences, type PreferenceFormState } from "@/lib/actions/settings";
import { DIGEST_FREQUENCIES, type NotificationPreferences } from "@/lib/domain/user-settings";
import { Button } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/select";
import { humanize } from "@/lib/utils";
import { ErrorAlert, SavedNote, ToggleRow, useSavedToast } from "./_shared";

const CHANNELS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: "inApp", label: "In-app notifications", description: "Show alerts in the app bell menu." },
  {
    key: "email",
    label: "Email notifications",
    description: "Email is not sent in local development; preference is stored.",
  },
];

const EVENTS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  {
    key: "assignments",
    label: "Work assigned to me",
    description: "When an item is assigned to you.",
  },
  {
    key: "mentions",
    label: "Comments & mentions",
    description: "Replies and @mentions on your items.",
  },
  {
    key: "blockers",
    label: "Blockers on my items",
    description: "When your work becomes blocked.",
  },
  { key: "sprints", label: "Sprint start & completion", description: "Sprint ceremony updates." },
  { key: "dueDates", label: "Due date reminders", description: "Upcoming and overdue work items." },
];

export function NotificationPrefsForm({ initial }: { initial: NotificationPreferences }) {
  const [state, action, pending] = useActionState<PreferenceFormState, FormData>(
    updatePreferences,
    {},
  );
  const [prefs, setPrefs] = useState<NotificationPreferences>(initial);
  const saved = useSavedToast(state.ok);

  function set<K extends keyof NotificationPreferences>(key: K, value: NotificationPreferences[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="group" value="notifications" />
      <input type="hidden" name="payload" value={JSON.stringify(prefs)} />

      <div className="space-y-2">
        <p className="text-sm font-medium">Channels</p>
        <ul className="space-y-2">
          {CHANNELS.map((c) => (
            <ToggleRow
              key={c.key}
              label={c.label}
              description={c.description}
              checked={prefs[c.key] as boolean}
              onChange={(v) => set(c.key, v as NotificationPreferences[typeof c.key])}
            />
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Events</p>
        <ul className="space-y-2">
          {EVENTS.map((e) => (
            <ToggleRow
              key={e.key}
              label={e.label}
              description={e.description}
              checked={prefs[e.key] as boolean}
              onChange={(v) => set(e.key, v as NotificationPreferences[typeof e.key])}
            />
          ))}
        </ul>
      </div>

      <div className="grid max-w-xs gap-2">
        <Label htmlFor="digestFrequency">Email digest frequency</Label>
        <Select
          id="digestFrequency"
          value={prefs.digestFrequency}
          onChange={(e) =>
            set("digestFrequency", e.target.value as NotificationPreferences["digestFrequency"])
          }
        >
          {DIGEST_FREQUENCIES.map((f) => (
            <option key={f} value={f}>
              {humanize(f)}
            </option>
          ))}
        </Select>
      </div>

      <ErrorAlert message={state.error} />
      <SavedNote show={saved}>Notification preferences saved.</SavedNote>

      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Save preferences
      </Button>
    </form>
  );
}
