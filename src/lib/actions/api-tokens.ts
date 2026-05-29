"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { can } from "@/lib/domain/permissions";
import { hashPassword } from "@/lib/auth/password";

export interface CreateTokenState {
  error?: string;
  ok?: boolean;
  /** Plaintext token, shown only once immediately after creation. */
  token?: string;
}

const createSchema = z.object({
  name: z.string().min(2, "Token name must be at least 2 characters"),
  expiresInDays: z.coerce.number().int().min(0).max(365),
  scopes: z.array(z.enum(["read", "write", "admin"])).min(1, "Select at least one scope"),
});

/** Create a developer API token. Plaintext is returned once; only the hash is stored. */
export async function createApiToken(
  _prev: CreateTokenState,
  formData: FormData,
): Promise<CreateTokenState> {
  const user = await requireUser();
  if (!can(user.role, "admin.access")) return { error: "You cannot manage API tokens" };

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    expiresInDays: formData.get("expiresInDays"),
    scopes: formData.getAll("scopes"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const raw = `agf_${randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 12);
  const expiresAt =
    parsed.data.expiresInDays > 0
      ? new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  await prisma.apiToken.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      prefix,
      tokenHash: await hashPassword(raw),
      scopes: parsed.data.scopes.join(","),
      expiresAt,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "api_token_create",
      entityType: "api_token",
      detail: `Created API token "${parsed.data.name}" (${parsed.data.scopes.join(", ")})`,
    },
  });

  revalidatePath("/settings");
  return { ok: true, token: raw };
}

/** Revoke (delete) an API token owned by the current user. */
export async function revokeApiToken(tokenId: string): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();
  if (!can(user.role, "admin.access")) return { error: "You cannot manage API tokens" };
  const row = await prisma.apiToken.findUnique({ where: { id: tokenId } });
  if (!row || row.userId !== user.id) return { error: "Token not found" };
  await prisma.apiToken.update({ where: { id: tokenId }, data: { revokedAt: new Date() } });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "api_token_revoke",
      entityType: "api_token",
      entityId: tokenId,
      detail: `Revoked API token "${row.name}"`,
    },
  });
  revalidatePath("/settings");
  return { ok: true };
}
