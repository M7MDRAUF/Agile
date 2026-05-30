"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/domain/permissions";
import { INTEGRATIONS } from "@/lib/domain/integrations";

/** Read all integrations, ensuring a row exists for each defined integration. */
export async function getIntegrations() {
  // BUG-M04: integration status is only exposed to authenticated users.
  await requireUser();
  const rows = await prisma.integration.findMany();
  const byKey = new Map(rows.map((r) => [r.key, r]));
  return INTEGRATIONS.map((def) => {
    const row = byKey.get(def.key);
    return {
      ...def,
      status: row?.status ?? "not_connected",
      accountLabel: row?.accountLabel ?? null,
      connectedAt: row?.connectedAt ?? null,
    };
  });
}

function assertManager(role: Parameters<typeof can>[0]): boolean {
  return can(role, "settings.manage_workspace");
}

/** Connect an integration (local-dev simulated). */
export async function connectIntegration(key: string): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();
  if (!assertManager(user.role)) return { error: "You cannot manage integrations" };
  const def = INTEGRATIONS.find((i) => i.key === key);
  if (!def) return { error: "Unknown integration" };

  await prisma.integration.upsert({
    where: { key },
    create: {
      key,
      name: def.name,
      status: "connected",
      accountLabel: "novacore (simulated)",
      connectedById: user.id,
      connectedAt: new Date(),
    },
    update: {
      status: "connected",
      accountLabel: "novacore (simulated)",
      connectedById: user.id,
      connectedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "integration_connect",
      entityType: "integration",
      entityId: key,
      detail: `Connected ${def.name} integration (simulated)`,
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}

/** Disconnect an integration. */
export async function disconnectIntegration(
  key: string,
): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();
  if (!assertManager(user.role)) return { error: "You cannot manage integrations" };
  const def = INTEGRATIONS.find((i) => i.key === key);
  if (!def) return { error: "Unknown integration" };

  await prisma.integration.upsert({
    where: { key },
    create: { key, name: def.name, status: "not_connected" },
    update: { status: "not_connected", accountLabel: null, connectedAt: null, connectedById: null },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "integration_disconnect",
      entityType: "integration",
      entityId: key,
      detail: `Disconnected ${def.name} integration`,
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}
