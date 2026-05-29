import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/utils";

export interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  detail: string | null;
  createdAt: Date;
  actorName: string | null;
}

/** Read-only recent activity log. Server-rendered from the live audit trail. */
export function AuditSection({ entries }: { entries: AuditEntry[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        The most recent security and configuration events recorded in the audit trail.
      </p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recorded activity yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {entries.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-4 p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="muted">{humanize(e.action)}</Badge>
                  <span className="text-xs text-muted-foreground">{e.entityType}</span>
                </div>
                {e.detail ? <p className="mt-1 text-sm">{e.detail}</p> : null}
                <p className="mt-0.5 text-xs text-muted-foreground">{e.actorName ?? "System"}</p>
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">
                {new Date(e.createdAt).toLocaleString()}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
