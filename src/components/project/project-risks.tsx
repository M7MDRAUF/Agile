"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, Plus } from "lucide-react";
import { createRisk, updateRiskStatus } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, Label } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RISK_SEVERITIES, RISK_STATUSES } from "@/lib/domain/constants";
import { humanize } from "@/lib/utils";

export interface ProjectRiskItem {
  id: string;
  title: string;
  severity: string;
  status: string;
}

interface ProjectRisksProps {
  projectId: string;
  risks: ProjectRiskItem[];
  canManage: boolean;
}

function severityVariant(severity: string): "danger" | "warning" | "muted" {
  if (severity === "high") return "danger";
  if (severity === "medium") return "warning";
  return "muted";
}

export function ProjectRisks({ projectId, risks, canManage }: ProjectRisksProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [pendingRiskId, setPendingRiskId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [creating, startCreating] = useTransition();

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setCreateError(null);
    startCreating(async () => {
      const result = await createRisk({}, formData);
      if (result.error) {
        setCreateError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function changeStatus(riskId: string, status: string) {
    setStatusError(null);
    setPendingRiskId(riskId);
    startTransition(async () => {
      const result = await updateRiskStatus(riskId, status);
      setPendingRiskId(null);
      if (result.error) {
        setStatusError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {risks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No risks logged.</p>
      ) : (
        risks.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
          >
            <Badge variant={severityVariant(r.severity)}>{humanize(r.severity)}</Badge>
            <span className="flex-1 text-sm">{r.title}</span>
            {canManage ? (
              <Select
                aria-label={`Status for ${r.title}`}
                value={r.status}
                onChange={(e) => changeStatus(r.id, e.target.value)}
                disabled={isPending && pendingRiskId === r.id}
                className="h-8 w-auto"
              >
                {RISK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {humanize(s)}
                  </option>
                ))}
              </Select>
            ) : (
              <Badge variant={r.status === "open" ? "info" : "success"}>{humanize(r.status)}</Badge>
            )}
          </div>
        ))
      )}

      {statusError ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          <AlertCircle className="size-4" />
          {statusError}
        </p>
      ) : null}

      {canManage ? (
        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <Plus className="size-4" />
            Log risk
          </Button>
        </div>
      ) : null}

      {open && canManage ? (
        <form onSubmit={handleCreate} className="grid gap-3 rounded-md border border-border p-3">
          <input type="hidden" name="projectId" value={projectId} />
          <div className="grid gap-2">
            <Label htmlFor="risk-title">Title *</Label>
            <Input id="risk-title" name="title" maxLength={200} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="risk-description">Description</Label>
            <Textarea id="risk-description" name="description" rows={3} maxLength={2000} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="risk-severity">Severity</Label>
            <Select id="risk-severity" name="severity" defaultValue="medium">
              {RISK_SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          </div>

          {createError ? (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              <AlertCircle className="size-4" />
              {createError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={creating}>
              {creating ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Add risk
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
