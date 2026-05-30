"use client";

import { useActionState, useState, useTransition } from "react";
import { LoaderCircle, Copy, Check, Trash2, KeyRound } from "lucide-react";
import { createApiToken, revokeApiToken, type CreateTokenState } from "@/lib/actions/api-tokens";
import { TOKEN_SCOPES } from "@/lib/domain/api-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, Label } from "@/components/ui/select";
import { ErrorAlert } from "./_shared";

export interface TokenView {
  id: string;
  name: string;
  prefix: string;
  scopes: string;
  createdAt: Date;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
}

function fmt(d: Date | null) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export function ApiTokensSection({ tokens }: { tokens: TokenView[] }) {
  const [state, action, pending] = useActionState<CreateTokenState, FormData>(createApiToken, {});
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string>();
  const [revokeError, setRevokeError] = useState<string>();
  const [list, setList] = useState<TokenView[]>(tokens);
  const [, startTransition] = useTransition();

  function copy(token: string) {
    void navigator.clipboard.writeText(token).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function revoke(id: string) {
    setRevokeError(undefined);
    setRevoking(id);
    startTransition(async () => {
      const res = await revokeApiToken(id);
      if (res.error) setRevokeError(res.error);
      else setList((prev) => prev.filter((t) => t.id !== id));
      setRevoking(undefined);
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Create personal access tokens for the AgileForge API. The full token is shown only once.
        </p>

        {state.ok && state.token ? (
          <div className="rounded-lg border border-green-600/40 bg-green-500/10 p-3">
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              Token created — copy it now, it won&apos;t be shown again.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-card px-2 py-1.5 font-mono text-xs">
                {state.token}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={() => copy(state.token!)}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        ) : null}

        <form action={action} className="space-y-4 rounded-lg border border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="token-name">Token name *</Label>
              <Input id="token-name" name="name" placeholder="CI pipeline" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="token-expiry">Expires in (days)</Label>
              <Select id="token-expiry" name="expiresInDays" defaultValue="90">
                <option value="0">Never</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
              </Select>
            </div>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Scopes *</legend>
            {TOKEN_SCOPES.map((s) => (
              <label key={s.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="scopes" value={s.value} className="size-4" />
                {s.label}
              </label>
            ))}
          </fieldset>
          <ErrorAlert message={state.error} />
          <Button type="submit" disabled={pending}>
            {pending ? <LoaderCircle className="animate-spin" /> : <KeyRound className="size-4" />}
            Generate token
          </Button>
        </form>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Active tokens</h3>
        <ErrorAlert message={revokeError} />
        {list.length === 0 ? (
          <p className="text-sm text-muted-foreground">No API tokens yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {list.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 p-3">
                <div className="min-w-0">
                  <p className="font-medium">{t.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{t.prefix}…</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.scopes.split(",").map((s) => (
                      <Badge key={s} variant="muted">
                        {s}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Created {fmt(t.createdAt)} · Expires {fmt(t.expiresAt)} · Last used{" "}
                    {fmt(t.lastUsedAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={revoking === t.id}
                  onClick={() => revoke(t.id)}
                >
                  {revoking === t.id ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
