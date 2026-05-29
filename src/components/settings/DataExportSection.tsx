"use client";

import { Download, FileJson, FileSpreadsheet, User } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const linkBtn = cn(buttonVariants({ variant: "outline", size: "sm" }));

/**
 * Download links to the export route handlers. These are real endpoints that
 * stream JSON/CSV; using anchors keeps the browser download flow intact.
 */
export function DataExportSection({ canExportWorkspace }: { canExportWorkspace: boolean }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Export your data for backup or migration. Files download directly from the server.
      </p>
      <ul className="space-y-2">
        <li className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-muted p-2 text-muted-foreground">
              <User className="size-4" />
            </span>
            <div>
              <p className="font-medium">My profile &amp; preferences</p>
              <p className="text-sm text-muted-foreground">
                Your account, stats, and saved preferences as JSON.
              </p>
            </div>
          </div>
          <a href="/api/export/profile" download className={linkBtn}>
            <Download className="size-4" /> JSON
          </a>
        </li>

        {canExportWorkspace ? (
          <li className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-muted p-2 text-muted-foreground">
                <FileSpreadsheet className="size-4" />
              </span>
              <div>
                <p className="font-medium">Workspace work items</p>
                <p className="text-sm text-muted-foreground">
                  All work items across projects, for reporting.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <a href="/api/export/workspace?format=csv" download className={linkBtn}>
                <FileSpreadsheet className="size-4" /> CSV
              </a>
              <a href="/api/export/workspace?format=json" download className={linkBtn}>
                <FileJson className="size-4" /> JSON
              </a>
            </div>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
