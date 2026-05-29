"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Monitor, LogOut } from "lucide-react";
import { revokeSession, revokeOtherSessions } from "@/lib/actions/security";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ErrorAlert } from "./_shared";

export interface SessionRow {
  id: string;
  deviceLabel: string;
  createdAt: string;
  lastActiveAt: string;
  current: boolean;
}

export function SessionsSection({ sessions }: { sessions: SessionRow[] }) {
  const [rows, setRows] = useState(sessions);
  const [error, setError] = useState<string>();
  const [pendingId, setPendingId] = useState<string>();
  const [revoking, startRevoke] = useTransition();

  function revokeOne(id: string) {
    setError(undefined);
    setPendingId(id);
    startRevoke(async () => {
      const res = await revokeSession(id);
      setPendingId(undefined);
      if (res.error) setError(res.error);
      else setRows((prev) => prev.filter((r) => r.id !== id));
    });
  }

  function revokeAllOthers() {
    setError(undefined);
    startRevoke(async () => {
      await revokeOtherSessions();
      setRows((prev) => prev.filter((r) => r.current));
    });
  }

  const others = rows.filter((r) => !r.current);

  return (
    <div className="space-y-4">
      <ErrorAlert message={error} />
      <ul className="space-y-2">
        {rows.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-4 rounded-md border border-border px-3 py-3"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Monitor className="size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium">
                  {s.deviceLabel}
                  {s.current ? <Badge variant="success">This device</Badge> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  Signed in {s.createdAt} · last active {s.lastActiveAt}
                </p>
              </div>
            </div>
            {s.current ? (
              <span className="text-xs text-muted-foreground">Active now</span>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => revokeOne(s.id)}
                disabled={revoking && pendingId === s.id}
              >
                {revoking && pendingId === s.id ? <LoaderCircle className="animate-spin" /> : null}
                Revoke
              </Button>
            )}
          </li>
        ))}
      </ul>

      {others.length > 0 ? (
        <Button variant="destructive" onClick={revokeAllOthers} disabled={revoking}>
          <LogOut className="size-4" />
          Sign out all other sessions ({others.length})
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">No other active sessions.</p>
      )}
    </div>
  );
}
