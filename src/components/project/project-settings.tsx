"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, Pencil, Archive } from "lucide-react";
import { updateProject, archiveProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, Label } from "@/components/ui/select";
import { PROJECT_STATUSES } from "@/lib/domain/constants";
import { humanize } from "@/lib/utils";

interface ProjectSettingsProps {
  projectId: string;
  name: string;
  description: string | null;
  status: string;
  canEdit: boolean;
  canArchive: boolean;
}

export function ProjectSettings({
  projectId,
  name,
  description,
  status,
  canEdit,
  canArchive,
}: ProjectSettingsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setEditError(null);
    startSaving(async () => {
      const result = await updateProject(projectId, {}, formData);
      if (result.error) {
        setEditError(result.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  async function handleArchive() {
    if (status === "archived") return;
    if (!window.confirm("Archive this project? It will be hidden from active project lists.")) {
      return;
    }
    setArchiving(true);
    setArchiveError(null);
    const result = await archiveProject(projectId);
    setArchiving(false);
    if (result.error) {
      setArchiveError(result.error);
      return;
    }
    router.refresh();
  }

  if (!canEdit && !canArchive) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {canEdit ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            <Pencil className="size-4" />
            Edit project
          </Button>
        ) : null}
        {canArchive && status !== "archived" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleArchive}
            disabled={archiving}
          >
            {archiving ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Archive className="size-4" />
            )}
            Archive
          </Button>
        ) : null}
      </div>

      {archiveError ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          <AlertCircle className="size-4" />
          {archiveError}
        </p>
      ) : null}

      {open && canEdit ? (
        <form onSubmit={handleSave} className="grid gap-4 rounded-md border border-border p-4">
          <div className="grid gap-2">
            <Label htmlFor="project-name">Project Name *</Label>
            <Input id="project-name" name="name" defaultValue={name} maxLength={100} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project-description">Description</Label>
            <Textarea
              id="project-description"
              name="description"
              defaultValue={description ?? ""}
              rows={4}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="project-status">Status</Label>
            <Select id="project-status" name="status" defaultValue={status}>
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
          </div>

          {editError ? (
            <p
              role="alert"
              className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
            >
              <AlertCircle className="size-4" />
              {editError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Save changes
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
