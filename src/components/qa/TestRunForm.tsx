"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordTestRun } from "@/lib/actions/qa";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, Label } from "@/components/ui/select";

export function TestRunForm({ testCaseId }: { testCaseId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("passed");
  const [notes, setNotes] = useState("");
  const [createBug, setCreateBug] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const res = await recordTestRun(testCaseId, status, notes, createBug);
          if (res?.error) setError(res.error);
          else {
            setNotes("");
            router.refresh();
          }
        });
      }}
      className="space-y-3"
    >
      <div className="grid gap-2">
        <Label htmlFor="status">Result</Label>
        <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="blocked">Blocked</option>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Observations, environment, evidence…"
        />
      </div>
      {status === "failed" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={createBug}
            onChange={(e) => setCreateBug(e.target.checked)}
          />
          Create a linked bug for this failure
        </label>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        Record run
      </Button>
    </form>
  );
}
