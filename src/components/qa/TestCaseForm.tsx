"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, AlertCircle } from "lucide-react";
import { createTestCase, updateTestCase, type TestCaseFormState } from "@/lib/actions/qa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, Label } from "@/components/ui/select";
import { PRIORITIES } from "@/lib/domain/constants";
import { humanize } from "@/lib/utils";

interface Option {
  id: string;
  label: string;
}

export interface TestCaseValues {
  id?: string;
  title: string;
  projectId: string;
  description: string;
  steps: string;
  expected: string;
  priority: string;
  workItemId: string;
}

export function TestCaseForm({
  projects,
  values,
}: {
  projects: Option[];
  values?: TestCaseValues;
}) {
  const router = useRouter();
  const action = values?.id ? updateTestCase.bind(null, values.id) : createTestCase;
  const [state, formAction, pending] = useActionState<TestCaseFormState, FormData>(action, {});

  useEffect(() => {
    if (state.ok) router.push("/qa");
  }, [state.ok, router]);

  return (
    <form action={formAction} className="grid max-w-2xl gap-4">
      <div className="grid gap-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" name="title" defaultValue={values?.title} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="projectId">Project *</Label>
          <Select
            id="projectId"
            name="projectId"
            defaultValue={values?.projectId}
            required
            disabled={Boolean(values?.id)}
          >
            <option value="">Select a project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="priority">Priority *</Label>
          <Select
            id="priority"
            name="priority"
            defaultValue={values?.priority ?? "medium"}
            required
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {humanize(p)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={values?.description} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="steps">Steps</Label>
        <Textarea
          id="steps"
          name="steps"
          rows={4}
          defaultValue={values?.steps}
          placeholder={"1. ...\n2. ..."}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="expected">Expected result</Label>
        <Textarea id="expected" name="expected" rows={2} defaultValue={values?.expected} />
      </div>

      <input type="hidden" name="workItemId" value={values?.workItemId ?? ""} />

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
          {values?.id ? "Save changes" : "Create test case"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
