"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, AlertCircle, CheckCircle2, UserPlus } from "lucide-react";
import { createUser, type CreateUserState } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Label } from "@/components/ui/select";
import { ROLES, ROLE_LABELS } from "@/lib/domain/constants";

export function CreateUserForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<CreateUserState, FormData>(createUser, {});

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.ok, router]);

  if (!open) {
    return (
      <Button type="button" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" /> New user
      </Button>
    );
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2"
    >
      <div className="grid gap-2">
        <Label htmlFor="name">Name *</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Temporary password *</Label>
        <Input id="password" name="password" type="password" minLength={8} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="role">Role *</Label>
        <Select id="role" name="role" defaultValue="developer" required>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor="title">Job title</Label>
        <Input id="title" name="title" placeholder="e.g. Backend Engineer" />
      </div>

      {state.error ? (
        <p
          role="alert"
          className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2"
        >
          <AlertCircle className="size-4" />
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="flex items-center gap-2 text-sm text-green-700 sm:col-span-2">
          <CheckCircle2 className="size-4" />
          User created.
        </p>
      ) : null}

      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : null}
          Create user
        </Button>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </form>
  );
}
