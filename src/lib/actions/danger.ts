"use server";

import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/domain/permissions";

const run = promisify(execFile);

export interface DangerState {
  error?: string;
  ok?: boolean;
  message?: string;
}

/** Whether the workspace is currently marked active. */
export async function isWorkspaceActive(): Promise<boolean> {
  await requireUser();
  const row = await prisma.appSetting.findUnique({ where: { key: "workspace.active" } });
  return row?.value !== "false";
}

/**
 * Toggle workspace activation. Requires the operator to type the exact
 * confirmation phrase. This is a reversible, persisted state change.
 */
export async function setWorkspaceActive(
  active: boolean,
  confirmation: string,
): Promise<DangerState> {
  const user = await requireUser();
  if (!can(user.role, "settings.manage_workspace")) {
    return { error: "You cannot manage the workspace" };
  }
  const expected = active ? "ACTIVATE WORKSPACE" : "DEACTIVATE WORKSPACE";
  if (confirmation.trim() !== expected) {
    return { error: `Type "${expected}" to confirm` };
  }

  await prisma.appSetting.upsert({
    where: { key: "workspace.active" },
    create: { key: "workspace.active", value: active ? "true" : "false" },
    update: { value: active ? "true" : "false" },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: active ? "workspace_activate" : "workspace_deactivate",
      entityType: "workspace",
      detail: active ? "Reactivated the workspace" : "Deactivated the workspace",
    },
  });

  revalidatePath("/settings");
  revalidatePath("/admin");
  return { ok: true, message: active ? "Workspace reactivated." : "Workspace deactivated." };
}

/**
 * Reset the demo dataset by re-running the seed script. This deletes and
 * recreates demo rows (it does NOT drop the schema). Local-development only.
 */
export async function resetDemoData(confirmation: string): Promise<DangerState> {
  const user = await requireUser();
  if (!can(user.role, "admin.access")) return { error: "You cannot reset demo data" };
  if (confirmation.trim() !== "RESET DEMO DATA") {
    return { error: 'Type "RESET DEMO DATA" to confirm' };
  }

  try {
    // SEC-011: command + args are hard-coded literals (no user input flows into
    // execFile). `execFile` (not `exec`/`spawn` with shell) prevents shell
    // interpretation. Reachable only by admin role with the typed confirmation.
    await run("npx", ["tsx", "prisma/seed.ts"], {
      cwd: process.cwd(),
      timeout: 120_000,
      windowsHide: true,
    });
  } catch (err) {
    return {
      error: `Reset failed: ${err instanceof Error ? err.message : "unknown error"}`,
    };
  }

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "demo_data_reset",
      entityType: "workspace",
      detail: "Reset the demo dataset (re-seeded)",
    },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Demo data has been reset." };
}
