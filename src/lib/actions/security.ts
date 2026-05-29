"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { authenticator } from "otplib";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { getSession } from "@/lib/auth/current-user";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isPasswordValid } from "@/lib/domain/password-policy";

// -- Change password --------------------------------------------------------

export interface PasswordFormState {
  error?: string;
  ok?: boolean;
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "New password and confirmation do not match",
    path: ["confirmPassword"],
  });

export async function changePassword(
  _prev: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const user = await requireUser();

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  if (!isPasswordValid(parsed.data.newPassword)) {
    return { error: "New password does not meet the strength requirements" };
  }

  const record = await prisma.user.findUnique({ where: { id: user.id } });
  if (!record) return { error: "Account not found" };

  const valid = await verifyPassword(parsed.data.currentPassword, record.passwordHash);
  if (!valid) return { error: "Your current password is incorrect" };

  if (await verifyPassword(parsed.data.newPassword, record.passwordHash)) {
    return { error: "New password must differ from the current password" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "password_change",
      entityType: "user",
      entityId: user.id,
      detail: "Changed account password",
    },
  });

  revalidatePath("/settings");
  return { ok: true };
}

// -- Multi-factor authentication (RFC 6238 TOTP via otplib) ----------------

export interface MfaState {
  error?: string;
  ok?: boolean;
  secret?: string;
  otpauthUrl?: string;
  recoveryCodes?: string[];
}

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Crypto-safe base32 generator (replaces Math.random() — fixes SEC-005). */
function randomBase32(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += BASE32[bytes[i] % 32];
  return out;
}

/** Crypto-safe recovery codes (replaces Math.random() — fixes SEC-005). */
function randomRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () => `${randomBase32(5)}-${randomBase32(5)}`);
}

/** Build an otpauth:// URI for QR-code provisioning (RFC 6238). */
function otpauthUrl(email: string, secret: string): string {
  return authenticator.keyuri(encodeURIComponent(email), "AgileForge", secret);
}

/**
 * Begin MFA setup: generate a TOTP secret (Base32, 160-bit entropy)
 * suitable for `otplib.authenticator`. The secret is returned but not yet
 * persisted as enabled — the user must confirm a valid code first.
 */
export async function beginMfaSetup(): Promise<MfaState> {
  const user = await requireUser();
  // authenticator.generateSecret uses crypto.randomBytes internally.
  const secret = authenticator.generateSecret(20);
  return { secret, otpauthUrl: otpauthUrl(user.email, secret) };
}

/**
 * Confirm MFA setup. Verifies the user-entered 6-digit code against the
 * provided secret using RFC 6238 TOTP. On success, persists the secret,
 * marks MFA enabled, and returns one-time recovery codes (hashed in the DB,
 * displayed in plaintext exactly once).
 */
export async function confirmMfa(_prev: MfaState, formData: FormData): Promise<MfaState> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim();
  const secret = String(formData.get("secret") ?? "").trim();

  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code from your authenticator app" };
  if (secret.length < 16) return { error: "Setup session expired, please restart" };

  // Verify against the secret using RFC 6238 TOTP. Default window allows for
  // ±1 step (30 s) clock skew, mirroring industry standard.
  const valid = authenticator.verify({ token: code, secret });
  if (!valid) return { error: "That code is invalid. Try the latest 6-digit code." };

  const recoveryCodes = randomRecoveryCodes();
  const hashedRecovery = await Promise.all(recoveryCodes.map((c) => hashPassword(c)));

  await prisma.user.update({
    where: { id: user.id },
    // mfaSecret stores the Base32 secret; mfaRecoveryCodes stores bcrypt
    // hashes (joined by newline) so the plaintext is shown to the user exactly
    // once here and never again.
    data: {
      mfaEnabled: true,
      mfaSecret: secret,
      mfaRecoveryCodes: hashedRecovery.join("\n"),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "mfa_enable",
      entityType: "user",
      entityId: user.id,
      detail: "Enabled multi-factor authentication",
    },
  });

  revalidatePath("/settings");
  return { ok: true, recoveryCodes };
}

export interface DisableMfaState {
  error?: string;
  ok?: boolean;
}

export async function disableMfa(): Promise<DisableMfaState> {
  const user = await requireUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: null },
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "mfa_disable",
      entityType: "user",
      entityId: user.id,
      detail: "Disabled multi-factor authentication",
    },
  });
  revalidatePath("/settings");
  return { ok: true };
}

// -- Active sessions --------------------------------------------------------

/** Revoke a single device session belonging to the current user. */
export async function revokeSession(sessionId: string): Promise<{ error?: string; ok?: boolean }> {
  const user = await requireUser();
  const row = await prisma.userSession.findUnique({ where: { id: sessionId } });
  if (!row || row.userId !== user.id) return { error: "Session not found" };
  await prisma.userSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
  revalidatePath("/settings");
  return { ok: true };
}

/** Revoke every session for the current user except the one in use. */
export async function revokeOtherSessions(): Promise<{ ok: boolean; count: number }> {
  const user = await requireUser();
  const session = await getSession();
  const result = await prisma.userSession.updateMany({
    where: {
      userId: user.id,
      revokedAt: null,
      ...(session?.sid ? { id: { not: session.sid } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "sessions_revoke_others",
      entityType: "user",
      entityId: user.id,
      detail: `Signed out ${result.count} other session(s)`,
    },
  });
  revalidatePath("/settings");
  return { ok: true, count: result.count };
}
