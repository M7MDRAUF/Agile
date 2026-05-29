"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { updatePreferences, type PreferenceFormState } from "@/lib/actions/settings";
import {
  LANGUAGES,
  TIMEZONES,
  DATE_FORMATS,
  TIME_FORMATS,
  WEEK_STARTS,
  formatDateSample,
  formatTimeSample,
  type LocalizationPreferences,
} from "@/lib/domain/user-settings";
import { Button } from "@/components/ui/button";
import { Select, Label } from "@/components/ui/select";
import { humanize } from "@/lib/utils";
import { ErrorAlert, SavedNote, useSavedToast } from "./_shared";

const SAMPLE = new Date(Date.UTC(2026, 2, 9, 15, 30));

export function LocalizationForm({ initial }: { initial: LocalizationPreferences }) {
  const [state, action, pending] = useActionState<PreferenceFormState, FormData>(
    updatePreferences,
    {},
  );
  const [prefs, setPrefs] = useState<LocalizationPreferences>(initial);
  const saved = useSavedToast(state.ok);

  function set<K extends keyof LocalizationPreferences>(key: K, value: LocalizationPreferences[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="group" value="localization" />
      <input type="hidden" name="payload" value={JSON.stringify(prefs)} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="language">Language</Label>
          <Select
            id="language"
            value={prefs.language}
            onChange={(e) => set("language", e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select
            id="timezone"
            value={prefs.timezone}
            onChange={(e) => set("timezone", e.target.value)}
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dateFormat">Date format</Label>
          <Select
            id="dateFormat"
            value={prefs.dateFormat}
            onChange={(e) =>
              set("dateFormat", e.target.value as LocalizationPreferences["dateFormat"])
            }
          >
            {DATE_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="timeFormat">Time format</Label>
          <Select
            id="timeFormat"
            value={prefs.timeFormat}
            onChange={(e) =>
              set("timeFormat", e.target.value as LocalizationPreferences["timeFormat"])
            }
          >
            {TIME_FORMATS.map((f) => (
              <option key={f} value={f}>
                {f === "24h" ? "24-hour" : "12-hour"}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="firstDayOfWeek">First day of week</Label>
          <Select
            id="firstDayOfWeek"
            value={prefs.firstDayOfWeek}
            onChange={(e) =>
              set("firstDayOfWeek", e.target.value as LocalizationPreferences["firstDayOfWeek"])
            }
          >
            {WEEK_STARTS.map((d) => (
              <option key={d} value={d}>
                {humanize(d)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
        <p className="font-medium">Preview</p>
        <p className="text-muted-foreground">
          Date: <span className="font-mono">{formatDateSample(prefs, SAMPLE)}</span> · Time:{" "}
          <span className="font-mono">{formatTimeSample(prefs, SAMPLE)}</span>
        </p>
      </div>

      <ErrorAlert message={state.error} />
      <SavedNote show={saved}>Regional settings saved.</SavedNote>

      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Save regional settings
      </Button>
    </form>
  );
}
