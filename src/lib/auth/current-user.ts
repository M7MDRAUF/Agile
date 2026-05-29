import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { can, type Permission } from "@/lib/domain/permissions";
import {
  PENDING_MFA_COOKIE,
  PENDING_MFA_MAX_AGE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createPendingMfaToken,
  createSessionToken,
  verifyPendingMfaToken,
  verifySessionToken,
  type PendingMfaPayload,
  type SessionPayload,
} from "./session";

/** Read and verify the session payload from the request cookies. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
});

/** Fetch the full, active user record for the current session (or null). */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  // When the token is bound to a device session, ensure it has not been
  // revoked (e.g. via "sign out other devices").
  if (session.sid) {
    const row = await prisma.userSession.findUnique({ where: { id: session.sid } });
    if (!row || row.revokedAt) return null;
  }
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== "active") return null;
  // SEC-013: reject sessions whose `sv` claim no longer matches the user's
  // current sessionVersion (e.g. after role change or forced sign-out).
  if (typeof session.sv === "number" && session.sv !== user.sessionVersion) return null;
  return user;
});

/** Throw if there is no authenticated user; returns the session otherwise. */
export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

/** Returns true when the current session role holds the given permission. */
export async function currentUserCan(permission: Permission): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return can(session.role, permission);
}

/** Persist a new session cookie (used by sign-in). */
export async function setSessionCookie(payload: SessionPayload): Promise<void> {
  const token = await createSessionToken(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Remove the session cookie (used by sign-out). */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Persist a short-lived pending-MFA cookie after password verification. */
export async function setPendingMfaCookie(payload: PendingMfaPayload): Promise<void> {
  const token = await createPendingMfaToken(payload);
  const store = await cookies();
  store.set(PENDING_MFA_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PENDING_MFA_MAX_AGE,
  });
}

/** Read and verify the pending-MFA cookie set during a partial sign-in. */
export async function getPendingMfa(): Promise<PendingMfaPayload | null> {
  const store = await cookies();
  return verifyPendingMfaToken(store.get(PENDING_MFA_COOKIE)?.value);
}

/** Remove the pending-MFA cookie after success/failure. */
export async function clearPendingMfaCookie(): Promise<void> {
  const store = await cookies();
  store.delete(PENDING_MFA_COOKIE);
}
