"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, AlertTriangle, RotateCcw, Power } from "lucide-react";
import { setWorkspaceActive, resetDemoData } from "@/lib/actions/danger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/select";
import { ErrorAlert, SavedNote } from "./_shared";

export function DangerZoneSection({
  workspaceActive,
  canManageWorkspace,
  canResetData,
}: {
  workspaceActive: boolean;
  canManageWorkspace: boolean;
  canResetData: boolean;
}) {
  const [, startTransition] = useTransition();

  // -- Workspace activation toggle --
  const [active, setActive] = useState(workspaceActive);
  const [activationInput, setActivationInput] = useState("");
  const [activationError, setActivationError] = useState<string>();
  const [activationMsg, setActivationMsg] = useState<string>();
  const [activationPending, setActivationPending] = useState(false);
  const expectedPhrase = active ? "DEACTIVATE WORKSPACE" : "ACTIVATE WORKSPACE";

  function submitActivation() {
    setActivationError(undefined);
    setActivationMsg(undefined);
    setActivationPending(true);
    const next = !active;
    startTransition(async () => {
      const res = await setWorkspaceActive(next, activationInput);
      if (res.error) setActivationError(res.error);
      else {
        setActive(next);
        setActivationInput("");
        setActivationMsg(res.message);
      }
      setActivationPending(false);
    });
  }

  // -- Demo data reset --
  const [resetInput, setResetInput] = useState("");
  const [resetError, setResetError] = useState<string>();
  const [resetMsg, setResetMsg] = useState<string>();
  const [resetPending, setResetPending] = useState(false);

  function submitReset() {
    setResetError(undefined);
    setResetMsg(undefined);
    setResetPending(true);
    startTransition(async () => {
      const res = await resetDemoData(resetInput);
      if (res.error) setResetError(res.error);
      else {
        setResetInput("");
        setResetMsg(res.message);
      }
      setResetPending(false);
    });
  }

  if (!canManageWorkspace && !canResetData) {
    return (
      <p className="text-sm text-muted-foreground">
        You do not have permission to perform destructive workspace actions.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
        <AlertTriangle className="size-4 shrink-0" />
        These actions affect the entire workspace. Type the exact confirmation phrase to proceed.
      </div>

      {canManageWorkspace ? (
        <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
          <div className="flex items-center gap-2">
            <Power className="size-4 text-destructive" />
            <h3 className="font-semibold">
              {active ? "Deactivate workspace" : "Reactivate workspace"}
            </h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {active
              ? "Deactivating marks the workspace inactive. This is reversible."
              : "The workspace is currently inactive. Reactivate to restore normal operation."}
          </p>
          <div className="grid gap-2">
            <Label htmlFor="activation-confirm">
              Type <span className="font-mono font-semibold">{expectedPhrase}</span>
            </Label>
            <Input
              id="activation-confirm"
              value={activationInput}
              onChange={(e) => setActivationInput(e.target.value)}
              placeholder={expectedPhrase}
            />
          </div>
          <ErrorAlert message={activationError} />
          {activationMsg ? <SavedNote show>{activationMsg}</SavedNote> : null}
          <Button
            type="button"
            variant="destructive"
            disabled={activationPending || activationInput.trim() !== expectedPhrase}
            onClick={submitActivation}
          >
            {activationPending ? <LoaderCircle className="animate-spin" /> : null}
            {active ? "Deactivate workspace" : "Reactivate workspace"}
          </Button>
        </div>
      ) : null}

      {canResetData ? (
        <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="size-4 text-destructive" />
            <h3 className="font-semibold">Reset demo data</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Deletes and recreates the demo dataset by re-running the seed script. This cannot be
            undone.
          </p>
          <div className="grid gap-2">
            <Label htmlFor="reset-confirm">
              Type <span className="font-mono font-semibold">RESET DEMO DATA</span>
            </Label>
            <Input
              id="reset-confirm"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="RESET DEMO DATA"
            />
          </div>
          <ErrorAlert message={resetError} />
          {resetMsg ? <SavedNote show>{resetMsg}</SavedNote> : null}
          <Button
            type="button"
            variant="destructive"
            disabled={resetPending || resetInput.trim() !== "RESET DEMO DATA"}
            onClick={submitReset}
          >
            {resetPending ? <LoaderCircle className="animate-spin" /> : null}
            Reset demo data
          </Button>
        </div>
      ) : null}
    </div>
  );
}
