"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Check, X } from "lucide-react";
import { changePassword, type PasswordFormState } from "@/lib/actions/security";
import { passwordChecks, passwordStrength } from "@/lib/domain/password-policy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ErrorAlert, SavedNote, useSavedToast } from "./_shared";

const STRENGTH_COLORS: Record<string, string> = {
  weak: "bg-red-500",
  fair: "bg-amber-500",
  good: "bg-blue-500",
  strong: "bg-green-500",
};

export function ChangePasswordForm({ email }: { email?: string }) {
  const [state, action, pending] = useActionState<PasswordFormState, FormData>(changePassword, {});
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const saved = useSavedToast(state.ok);

  const checks = passwordChecks(newPassword);
  const { score, label } = passwordStrength(newPassword);
  const mismatch = confirm.length > 0 && confirm !== newPassword;

  return (
    <form
      action={action}
      className="space-y-4"
      key={state.ok ? "reset" : "form"}
      autoComplete="off"
    >
      {/* Satisfies browser requirement: password forms must include a username context. */}
      <input
        type="hidden"
        autoComplete="username"
        value={email ?? ""}
        aria-hidden="true"
        readOnly
      />
      <div className="grid gap-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        {newPassword ? (
          <div className="space-y-2">
            <div className="flex gap-1" aria-hidden>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full",
                    i < score ? STRENGTH_COLORS[label] : "bg-muted",
                  )}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Password strength: <span className="font-medium capitalize">{label}</span>
            </p>
            <ul className="grid gap-1 sm:grid-cols-2">
              {checks.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    c.passed ? "text-green-600 dark:text-green-400" : "text-muted-foreground",
                  )}
                >
                  {c.passed ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-invalid={mismatch}
        />
        {mismatch ? <p className="text-xs text-red-500">Passwords do not match.</p> : null}
      </div>

      <ErrorAlert message={state.error} />
      <SavedNote show={saved}>Password updated.</SavedNote>

      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Update password
      </Button>
    </form>
  );
}
