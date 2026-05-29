"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authenticator } from "otplib";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { isRole } from "@/lib/domain/constants";
import { describeUserAgent } from "@/lib/domain/user-agent";
import {
  clearPendingMfaCookie,
  clearSessionCookie,
  getPendingMfa,
  getSession,
  setPendingMfaCookie,
  setSessionCookie,
} from "@/lib/auth/current-user";

// NOTE: In-memory rate limiting is scoped to a single Node.js process. It will not
// persist across serverless cold starts or multiple instances, but meaningfully
// reduces single-process brute-force risk in the demo environment. A shared
// store (Redis/Upstash) is scheduled in Batch 2.
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function incrementLoginAttempts(ip: string): void {
  const now = Date.now();
  const current = loginAttempts.get(ip);
  if (current && now < current.resetAt) {
    loginAttempts.set(ip, { count: current.count + 1, resetAt: current.resetAt });
  } else {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  }
}

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export interface LoginState {
  error?: string;
  /** When true, the client must POST the MFA code via verifyMfaLoginAction. */
  mfaRequired?: boolean;
}

async function completeSignIn(
  user: { id: string; email: string; name: string; role: string; sessionVersion: number },
  next: string | null,
  userAgent: string | undefined,
): Promise<never> {
  if (!isRole(user.role)) {
    throw new Error("Your account role is misconfigured. Contact an administrator.");
  }
  // Record a device session so it can be listed and revoked from Settings.
  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      userAgent,
      ipLabel: describeUserAgent(userAgent).deviceLabel,
    },
  });
  await setSessionCookie({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sid: session.id,
    sv: user.sessionVersion,
  });
  await clearPendingMfaCookie();
  redirect(next && next.startsWith("/") ? next : "/dashboard");
}

export async function signInAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? "unknown";

  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (entry && entry.count >= MAX_ATTEMPTS && now < entry.resetAt) {
    return { error: "Too many login attempts. Please try again later." };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
  });
  if (!user || user.status !== "active") {
    incrementLoginAttempts(ip);
    return { error: "Invalid email or password" };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    incrementLoginAttempts(ip);
    return { error: "Invalid email or password" };
  }

  loginAttempts.delete(ip);

  const next = formData.get("next");
  const nextStr = typeof next === "string" ? next : null;

  // SEC-002 fix: when MFA is enabled, do NOT issue a full session yet. Issue a
  // short-lived pending-MFA cookie and instruct the UI to request the TOTP.
  if (user.mfaEnabled && user.mfaSecret) {
    await setPendingMfaCookie({
      userId: user.id,
      pendingMfa: true,
      next: nextStr && nextStr.startsWith("/") ? nextStr : undefined,
    });
    return { mfaRequired: true };
  }

  const userAgent = hdrs.get("user-agent") ?? undefined;
  await completeSignIn(user, nextStr, userAgent);
  // Unreachable: completeSignIn always redirects.
  return {};
}

const mfaSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app"),
});

/**
 * Second step of MFA login. Reads the short-lived pending-MFA cookie, verifies
 * the user-entered TOTP against the stored secret, and issues the full session
 * on success. Accepts a one-time recovery code as a fallback (and invalidates
 * it). Without a valid pending-MFA cookie this action refuses to run.
 */
export async function verifyMfaLoginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const pending = await getPendingMfa();
  if (!pending) return { error: "Sign in again — your MFA session expired." };

  const code = String(formData.get("code") ?? "").trim();
  const isRecovery = String(formData.get("recovery") ?? "") === "true";

  if (!isRecovery) {
    const parsed = mfaSchema.safeParse({ code });
    if (!parsed.success) return { mfaRequired: true, error: parsed.error.issues[0]?.message };
  } else if (!code) {
    return { mfaRequired: true, error: "Enter one of your recovery codes." };
  }

  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user || user.status !== "active" || !user.mfaEnabled || !user.mfaSecret) {
    await clearPendingMfaCookie();
    return { error: "Sign in again — your MFA session expired." };
  }

  let recoveryConsumed: string | null = null;
  if (isRecovery) {
    const { verifyPassword: vp } = await import("@/lib/auth/password");
    const lines = (user.mfaRecoveryCodes ?? "").split("\n").filter(Boolean);
    let matchIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (await vp(code, lines[i])) {
        matchIdx = i;
        break;
      }
    }
    if (matchIdx === -1) return { mfaRequired: true, error: "That recovery code is not valid." };
    lines.splice(matchIdx, 1);
    recoveryConsumed = lines.join("\n");
  } else {
    const ok = authenticator.verify({ token: code, secret: user.mfaSecret });
    if (!ok) return { mfaRequired: true, error: "That code is invalid. Try the latest 6-digit code." };
  }

  if (recoveryConsumed !== null) {
    await prisma.user.update({
      where: { id: user.id },
      data: { mfaRecoveryCodes: recoveryConsumed },
    });
  }

  const hdrs = await headers();
  const userAgent = hdrs.get("user-agent") ?? undefined;
  await completeSignIn(user, pending.next ?? null, userAgent);
  return {};
}

export async function signOutAction(): Promise<void> {
  const session = await getSession();
  if (session?.sid) {
    await prisma.userSession
      .update({ where: { id: session.sid }, data: { revokedAt: new Date() } })
      .catch(() => undefined);
  }
  await clearSessionCookie();
  await clearPendingMfaCookie();
  redirect("/login");
}
