"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible on/off switch used throughout Settings. */
export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50",
        checked ? "bg-primary" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

/** A labelled toggle row used in preference lists. */
export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <li className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Toggle checked={checked} onChange={onChange} label={label} disabled={disabled} />
    </li>
  );
}

/** Inline error alert (consistent across forms). */
export function ErrorAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
    >
      <AlertCircle className="size-4 shrink-0" />
      {message}
    </p>
  );
}

/** Transient success line that auto-hides; returns [visible, show]. */
export function useSavedToast(ok: boolean | undefined, onSaved?: () => void) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (ok) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- toast after submit
      setSaved(true);
      onSaved?.();
      const t = setTimeout(() => setSaved(false), 2500);
      return () => clearTimeout(t);
    }
  }, [ok, onSaved]);
  return saved;
}

export function SavedNote({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <p className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
      <CheckCircle2 className="size-4" />
      {children}
    </p>
  );
}
