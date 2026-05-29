import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/domain/constants";

// Stateless session: a signed JWT stored in an httpOnly cookie. Suitable for
// local development and a single-instance deployment; swap for a database
// session store or real IdP when moving to production.

export const SESSION_COOKIE = "agileforge_session";
export const PENDING_MFA_COOKIE = "agileforge_pending_mfa";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
const PENDING_MFA_MAX_AGE_SECONDS = 5 * 60; // 5 minutes

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  /** Id of the UserSession row backing this token (device session). */
  sid?: string;
  /** SEC-013 session version. Must match User.sessionVersion or session is rejected. */
  sv?: number;
}

/** Short-lived token issued after password verification when MFA is required. */
export interface PendingMfaPayload {
  userId: string;
  pendingMfa: true;
  /** Sticky redirect target after MFA completes. */
  next?: string;
}

const authSecret = process.env.AUTH_SECRET;
if (!authSecret) {
  throw new Error("AUTH_SECRET environment variable is required");
}
const secret = new TextEncoder().encode(authSecret);

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (
      typeof payload.userId === "string" &&
      typeof payload.email === "string" &&
      typeof payload.name === "string" &&
      typeof payload.role === "string"
    ) {
      return {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: payload.role as Role,
        sid: typeof payload.sid === "string" ? payload.sid : undefined,
        sv: typeof payload.sv === "number" ? payload.sv : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
export const PENDING_MFA_MAX_AGE = PENDING_MFA_MAX_AGE_SECONDS;

export async function createPendingMfaToken(payload: PendingMfaPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${PENDING_MFA_MAX_AGE_SECONDS}s`)
    .sign(secret);
}

export async function verifyPendingMfaToken(
  token: string | undefined | null,
): Promise<PendingMfaPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId === "string" && payload.pendingMfa === true) {
      return {
        userId: payload.userId,
        pendingMfa: true,
        next: typeof payload.next === "string" ? payload.next : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
}
