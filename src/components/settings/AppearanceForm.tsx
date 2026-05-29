"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Sun, Moon, Monitor } from "lucide-react";
import { updatePreferences, type PreferenceFormState } from "@/lib/actions/settings";
import {
  THEMES,
  DENSITIES,
  type AppearancePreferences,
  type Theme,
} from "@/lib/domain/user-settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ErrorAlert, SavedNote, ToggleRow, useSavedToast } from "./_shared";

const THEME_ICONS: Record<Theme, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };

/** Apply a preference live to the app shell so changes are visible instantly. */
function applyLive(prefs: AppearancePreferences) {
  const shell = document.getElementById("app-shell");
  if (!shell) return;
  const prefersDark =
    prefs.theme === "dark" ||
    (prefs.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  shell.classList.toggle("dark", prefersDark);
  shell.classList.toggle("density-compact", prefs.density === "compact");
  shell.classList.toggle("reduce-motion", prefs.reduceMotion);
  shell.classList.toggle("high-contrast", prefs.highContrast);
}

export function AppearanceForm({ initial }: { initial: AppearancePreferences }) {
  const [state, action, pending] = useActionState<PreferenceFormState, FormData>(
    updatePreferences,
    {},
  );
  const [prefs, setPrefs] = useState<AppearancePreferences>(initial);
  const saved = useSavedToast(state.ok);

  function update(next: AppearancePreferences) {
    setPrefs(next);
    applyLive(next);
  }

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="group" value="appearance" />
      <input type="hidden" name="payload" value={JSON.stringify(prefs)} />

      <div className="space-y-2">
        <Label>Theme</Label>
        <div className="flex flex-wrap gap-2">
          {THEMES.map((t) => {
            const Icon = THEME_ICONS[t];
            return (
              <Button
                key={t}
                type="button"
                variant={prefs.theme === t ? "default" : "outline"}
                size="sm"
                onClick={() => update({ ...prefs, theme: t })}
              >
                <Icon className="size-4" />
                <span className="capitalize">{t}</span>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Density</Label>
        <div className="flex flex-wrap gap-2">
          {DENSITIES.map((d) => (
            <Button
              key={d}
              type="button"
              variant={prefs.density === d ? "default" : "outline"}
              size="sm"
              onClick={() => update({ ...prefs, density: d })}
              className={cn("capitalize")}
            >
              {d}
            </Button>
          ))}
        </div>
      </div>

      <ul className="space-y-2">
        <ToggleRow
          label="Reduce motion"
          description="Minimize animations and transitions."
          checked={prefs.reduceMotion}
          onChange={(v) => update({ ...prefs, reduceMotion: v })}
        />
        <ToggleRow
          label="High contrast"
          description="Increase border and text contrast for readability."
          checked={prefs.highContrast}
          onChange={(v) => update({ ...prefs, highContrast: v })}
        />
        <ToggleRow
          label="Collapse sidebar by default"
          description="Start with a compact, icon-only navigation."
          checked={prefs.sidebarCollapsed}
          onChange={(v) => update({ ...prefs, sidebarCollapsed: v })}
        />
      </ul>

      <ErrorAlert message={state.error} />
      <SavedNote show={saved}>Appearance saved.</SavedNote>

      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Save appearance
      </Button>
    </form>
  );
}
