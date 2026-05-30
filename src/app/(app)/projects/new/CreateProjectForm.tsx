"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoaderCircle, AlertCircle } from "lucide-react";
import { createProject, type CreateProjectState } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/select";

export function CreateProjectForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState<CreateProjectState, FormData>(createProject, {});

  useEffect(() => {
    if (state.ok && state.projectId) {
      router.push(`/projects/${state.projectId}`);
    }
  }, [state.ok, state.projectId, router]);

  return (
    <form action={action} className="grid max-w-2xl gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Project Name *</Label>
        <Input id="name" name="name" placeholder="e.g. Nova Platform" maxLength={100} required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="key">Project Key *</Label>
        <Input
          id="key"
          name="key"
          placeholder="e.g. NOVA"
          maxLength={6}
          className="uppercase"
          required
        />
        <p className="text-xs text-muted-foreground">
          2–6 uppercase letters or digits. Used as the prefix for all work item keys (e.g.{" "}
          <span className="font-mono">NOVA-1</span>). Cannot be changed later.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="What is this project about?"
          rows={4}
        />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <AlertCircle className="size-4" />
          {state.error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          Create project
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
