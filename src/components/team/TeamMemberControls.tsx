"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, X } from "lucide-react";
import { addTeamMember, removeTeamMember } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, Label } from "@/components/ui/select";

interface UserOption {
  id: string;
  label: string;
}

export function AddTeamMember({
  teamId,
  candidates,
}: {
  teamId: string;
  candidates: UserOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [userId, setUserId] = useState("");
  const [roleName, setRoleName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!userId) {
      setError("Select a user");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addTeamMember(teamId, userId, roleName || null);
      if (res?.error) {
        setError(res.error);
      } else {
        setUserId("");
        setRoleName("");
        router.refresh();
      }
    });
  }

  if (candidates.length === 0) {
    return <p className="text-xs text-muted-foreground">All users are already members.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="grid min-w-40 flex-1 gap-1">
          <Label htmlFor="member">Add member</Label>
          <Select id="member" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Select user…</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid w-32 gap-1">
          <Label htmlFor="roleName">Role</Label>
          <Input
            id="roleName"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="optional"
          />
        </div>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

export function RemoveTeamMember({ teamId, userId }: { teamId: string; userId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Remove member"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await removeTeamMember(teamId, userId);
          router.refresh();
        })
      }
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <X className="size-4" />}
    </Button>
  );
}
