"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { updateProfile, type ProfileFormState } from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";
import { ErrorAlert, SavedNote, useSavedToast } from "./_shared";

export function ProfileForm({
  defaultName,
  defaultTitle,
  defaultDepartment,
}: {
  defaultName: string;
  defaultTitle: string;
  defaultDepartment: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(updateProfile, {});
  const saved = useSavedToast(state.ok, () => router.refresh());

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Display name</Label>
          <Input id="name" name="name" defaultValue={defaultName} required minLength={2} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="title">Job title</Label>
          <Input
            id="title"
            name="title"
            defaultValue={defaultTitle}
            placeholder="e.g. Senior Engineer"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="department">Department / team</Label>
          <Input
            id="department"
            name="department"
            defaultValue={defaultDepartment}
            placeholder="e.g. Platform Engineering"
          />
        </div>
      </div>

      <ErrorAlert message={state.error} />
      <SavedNote show={saved}>Profile saved.</SavedNote>

      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        Save profile
      </Button>
    </form>
  );
}
