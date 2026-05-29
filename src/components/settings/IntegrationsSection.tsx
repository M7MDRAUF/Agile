"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Plug, Check } from "lucide-react";
import { connectIntegration, disconnectIntegration } from "@/lib/actions/integrations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorAlert } from "./_shared";

export interface IntegrationView {
  key: string;
  name: string;
  description: string;
  status: string;
  accountLabel: string | null;
  connectedAt: Date | null;
}

export function IntegrationsSection({
  integrations,
  canManage,
}: {
  integrations: IntegrationView[];
  canManage: boolean;
}) {
  const [error, setError] = useState<string>();
  const [pendingKey, setPendingKey] = useState<string>();
  const [, startTransition] = useTransition();

  function toggle(key: string, connected: boolean) {
    setError(undefined);
    setPendingKey(key);
    startTransition(async () => {
      const res = connected ? await disconnectIntegration(key) : await connectIntegration(key);
      if (res.error) setError(res.error);
      setPendingKey(undefined);
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Connect external tools. Connections are simulated in local development — no real OAuth
        handshake is performed.
      </p>
      <ErrorAlert message={error} />
      <ul className="space-y-2">
        {integrations.map((i) => {
          const connected = i.status === "connected";
          const busy = pendingKey === i.key;
          return (
            <li
              key={i.key}
              className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
                  <Plug className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{i.name}</p>
                    {connected ? (
                      <Badge variant="success">
                        <Check className="mr-1 size-3" /> Connected
                      </Badge>
                    ) : (
                      <Badge variant="muted">Not connected</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{i.description}</p>
                  {connected && i.accountLabel ? (
                    <p className="mt-1 text-xs text-muted-foreground">Account: {i.accountLabel}</p>
                  ) : null}
                </div>
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant={connected ? "outline" : "default"}
                  size="sm"
                  disabled={busy}
                  onClick={() => toggle(i.key, connected)}
                >
                  {busy ? <LoaderCircle className="animate-spin" /> : null}
                  {connected ? "Disconnect" : "Connect"}
                </Button>
              ) : (
                <Badge variant="outline">Admin only</Badge>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
