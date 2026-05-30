"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ExternalLink,
  GitPullRequest,
  PenTool,
  FileText,
  LinkIcon,
  LoaderCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { addWorkItemLink, removeWorkItemLink } from "@/lib/actions/work-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Label } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  WORK_ITEM_LINK_TYPES,
  WORK_ITEM_LINK_LABELS,
  type WorkItemLinkType,
} from "@/lib/domain/constants";

export interface WorkItemLinkRow {
  id: string;
  type: string;
  url: string;
  label: string | null;
}

interface WorkItemLinksProps {
  workItemId: string;
  links: WorkItemLinkRow[];
  canManage: boolean;
}

function linkIcon(type: string) {
  switch (type) {
    case "pr":
      return <GitPullRequest className="size-4" />;
    case "figma":
      return <PenTool className="size-4" />;
    case "doc":
      return <FileText className="size-4" />;
    case "design":
      return <LinkIcon className="size-4" />;
    default:
      return <ExternalLink className="size-4" />;
  }
}

export function WorkItemLinks({ workItemId, links, canManage }: WorkItemLinksProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [adding, startAdding] = useTransition();

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setAddError(null);
    startAdding(async () => {
      const result = await addWorkItemLink({}, formData);
      if (result.error) {
        setAddError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  function remove(linkId: string) {
    setRemoveError(null);
    setPendingId(linkId);
    startTransition(async () => {
      const result = await removeWorkItemLink(linkId);
      setPendingId(null);
      if (result.error) {
        setRemoveError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {links.length === 0 ? (
        <p className="text-sm text-muted-foreground">No links attached.</p>
      ) : (
        <ul className="space-y-2">
          {links.map((l) => (
            <li
              key={l.id}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
            >
              <span className="text-muted-foreground">{linkIcon(l.type)}</span>
              <Badge variant="muted">
                {WORK_ITEM_LINK_LABELS[l.type as WorkItemLinkType] ?? "Link"}
              </Badge>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-sm text-primary hover:underline"
              >
                {l.label || l.url}
              </a>
              {canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(l.id)}
                  disabled={isPending && pendingId === l.id}
                  aria-label="Remove link"
                >
                  {isPending && pendingId === l.id ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {removeError ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          <AlertCircle className="size-4" />
          {removeError}
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
            Add link
          </Button>
        </div>
      ) : null}

      {open && canManage ? (
        <form onSubmit={handleAdd} className="grid gap-3 rounded-md border border-border p-3">
          <input type="hidden" name="workItemId" value={workItemId} />
          <div className="grid gap-2">
            <Label htmlFor="link-type">Type</Label>
            <Select id="link-type" name="type" defaultValue="pr">
              {WORK_ITEM_LINK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {WORK_ITEM_LINK_LABELS[t]}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="link-url">URL *</Label>
            <Input
              id="link-url"
              name="url"
              type="url"
              placeholder="https://…"
              maxLength={2000}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="link-label">Label</Label>
            <Input
              id="link-label"
              name="label"
              placeholder="Optional display text"
              maxLength={120}
            />
          </div>

          {addError ? (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              <AlertCircle className="size-4" />
              {addError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={adding}>
              {adding ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Add link
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
