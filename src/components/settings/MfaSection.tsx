"use client";

import { useActionState, useState, useTransition } from "react";
import { LoaderCircle, ShieldCheck, ShieldOff, Copy } from "lucide-react";
import { beginMfaSetup, confirmMfa, disableMfa, type MfaState } from "@/lib/actions/security";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ErrorAlert } from "./_shared";

export function MfaSection({ enabled }: { enabled: boolean }) {
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [beginning, startBegin] = useTransition();
  const [disabling, startDisable] = useTransition();
  const [state, confirmAction, confirming] = useActionState<MfaState, FormData>(confirmMfa, {});

  function begin() {
    startBegin(async () => {
      const res = await beginMfaSetup();
      if (res.secret) setSetupSecret(res.secret);
    });
  }

  function disable() {
    startDisable(async () => {
      await disableMfa();
    });
  }

  // Recovery codes shown once after successful enable.
  if (state.ok && state.recoveryCodes) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
          <ShieldCheck className="size-4" /> Two-factor authentication is now enabled.
        </p>
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="text-sm font-medium">Save your recovery codes</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Store these somewhere safe. Each code can be used once if you lose access to your
            authenticator.
          </p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {state.recoveryCodes.map((c) => (
              <code key={c} className="rounded bg-card px-2 py-1">
                {c}
              </code>
            ))}
          </div>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Done
        </Button>
      </div>
    );
  }

  if (enabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="success">Enabled</Badge>
          <span className="text-sm text-muted-foreground">
            Your account is protected with an authenticator app.
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Local-development simulated TOTP — no codes are sent or externally verified.
        </p>
        <Button variant="destructive" onClick={disable} disabled={disabling}>
          {disabling ? <LoaderCircle className="animate-spin" /> : <ShieldOff className="size-4" />}
          Disable two-factor authentication
        </Button>
      </div>
    );
  }

  if (setupSecret) {
    return (
      <form action={confirmAction} className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="muted">Disabled</Badge>
          <span className="text-sm text-muted-foreground">Step 2 of 2 — confirm a code</span>
        </div>
        <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
          <li>Open your authenticator app (e.g. 1Password, Authy, Google Authenticator).</li>
          <li>Add a new account using this setup key:</li>
        </ol>
        <div className="flex items-center gap-2">
          <code className="rounded bg-muted px-3 py-2 font-mono text-sm tracking-widest">
            {setupSecret}
          </code>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigator.clipboard?.writeText(setupSecret)}
            aria-label="Copy setup key"
          >
            <Copy className="size-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Local-development simulated TOTP — enter any 6-digit code to confirm.
        </p>
        <input type="hidden" name="secret" value={setupSecret} />
        <div className="grid max-w-xs gap-2">
          <Label htmlFor="code">6-digit code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            required
          />
        </div>
        <ErrorAlert message={state.error} />
        <div className="flex gap-2">
          <Button type="submit" disabled={confirming}>
            {confirming ? <LoaderCircle className="animate-spin" /> : null}
            Verify & enable
          </Button>
          <Button type="button" variant="ghost" onClick={() => setSetupSecret(null)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="muted">Disabled</Badge>
        <span className="text-sm text-muted-foreground">
          Add an extra layer of security to your account.
        </span>
      </div>
      <p className="text-sm text-muted-foreground">
        Two-factor authentication requires a one-time code from an authenticator app in addition to
        your password when signing in.
      </p>
      <Button onClick={begin} disabled={beginning}>
        {beginning ? <LoaderCircle className="animate-spin" /> : <ShieldCheck className="size-4" />}
        Enable two-factor authentication
      </Button>
    </div>
  );
}
