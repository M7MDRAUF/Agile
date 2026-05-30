"use client";

import { useActionState, useState } from "react";
import { AlertCircle, KeyRound, LoaderCircle, LogIn } from "lucide-react";
import { signInAction, verifyMfaLoginAction, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";

const DEMO_ACCOUNTS = [
  { role: "System Admin", email: "admin@novacore.dev" },
  { role: "Engineering Manager", email: "em@novacore.dev" },
  { role: "Product Owner", email: "po@novacore.dev" },
  { role: "Scrum Master", email: "sm@novacore.dev" },
  { role: "Software Engineer", email: "engineer@novacore.dev" },
  { role: "QA Engineer", email: "qa@novacore.dev" },
  { role: "Designer", email: "designer@novacore.dev" },
  { role: "Stakeholder", email: "stakeholder@novacore.dev" },
];

export function LoginForm({ next }: { next?: string }) {
  const [credState, credAction, credPending] = useActionState<LoginState, FormData>(
    signInAction,
    {},
  );
  const [mfaState, mfaAction, mfaPending] = useActionState<LoginState, FormData>(
    verifyMfaLoginAction,
    {},
  );
  const [useRecovery, setUseRecovery] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const stage: "credentials" | "mfa" = credState.mfaRequired ? "mfa" : "credentials";
  const activeState = stage === "mfa" ? mfaState : credState;
  const pending = stage === "mfa" ? mfaPending : credPending;

  const handleCredSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const errors: { email?: string; password?: string } = {};
    if (!email) errors.email = "Email is required.";
    if (!password) errors.password = "Password is required.";
    if (errors.email ?? errors.password) {
      e.preventDefault();
      setFieldErrors(errors);
    } else {
      setFieldErrors({});
    }
  };

  return (
    <div className="grid gap-6">
      {stage === "credentials" ? (
        <form action={credAction} onSubmit={handleCredSubmit} className="grid gap-4">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              placeholder="you@novacore.dev"
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? "email-error" : undefined}
            />
            {fieldErrors.email ? (
              <p id="email-error" role="alert" className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="size-3.5 shrink-0" />
                {fieldErrors.email}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? "password-error" : undefined}
            />
            {fieldErrors.password ? (
              <p id="password-error" role="alert" className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="size-3.5 shrink-0" />
                {fieldErrors.password}
              </p>
            ) : null}
          </div>
          {activeState.error ? (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <AlertCircle className="size-4" />
              {activeState.error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <LoaderCircle className="animate-spin" /> : <LogIn />}
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      ) : (
        <form action={mfaAction} className="grid gap-4" aria-labelledby="mfa-title">
          <div className="grid gap-1">
            <h2 id="mfa-title" className="text-sm font-semibold text-foreground">
              Two-factor authentication
            </h2>
            <p className="text-xs text-muted-foreground">
              {useRecovery
                ? "Enter one of your saved recovery codes."
                : "Enter the 6-digit code from your authenticator app."}
            </p>
          </div>
          <input type="hidden" name="recovery" value={useRecovery ? "true" : "false"} />
          <div className="grid gap-2">
            <Label htmlFor="code">{useRecovery ? "Recovery code" : "Authentication code"}</Label>
            <Input
              id="code"
              name="code"
              type="text"
              inputMode={useRecovery ? "text" : "numeric"}
              pattern={useRecovery ? undefined : "[0-9]{6}"}
              autoComplete="one-time-code"
              autoFocus
              required
            />
          </div>
          {activeState.error ? (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              <AlertCircle className="size-4" />
              {activeState.error}
            </p>
          ) : null}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? <LoaderCircle className="animate-spin" /> : <KeyRound />}
            {pending ? "Verifying…" : "Verify and sign in"}
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            onClick={() => setUseRecovery((v) => !v)}
          >
            {useRecovery ? "Use my authenticator app instead" : "Use a recovery code instead"}
          </button>
        </form>
      )}

      <div className="rounded-md border border-border bg-muted/50 p-3 text-xs">
        <p className="mb-2 font-medium text-foreground">Demo accounts (password: Password123!)</p>
        <ul className="grid grid-cols-2 gap-1 text-muted-foreground">
          {DEMO_ACCOUNTS.map((a) => (
            <li key={a.email}>
              <span className="font-medium text-foreground">{a.role}:</span> {a.email}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
