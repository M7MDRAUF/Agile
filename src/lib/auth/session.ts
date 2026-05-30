import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@/lib/domain/constants";

// Stateless session: a signed JWT stored in an httpOnly cookie. Suitable for
// local development and a single-instance deployment; swap for a database
// session store or real IdP when moving to production.

export const SESSION_COOKIE = "agileforge_session";
export const PENDING_MFA_COOKIE = "agileforge_pending_mfa";
// BUG-M14 / SA-003: the edge proxy verifies the session JWT but cannot reach
// Prisma to detect a session that was revoked or whose role changed (revocation
// is enforced fail-closed server-side in getCurrentUser on every request). To
// bound the window in which a revoked token can still pass the *edge* gate, the
// token is short-lived and non-sliding: a revoked/role-changed session stops
// passing the edge within one TTL window (8h) while the server layer blocks its
// data access immediately.
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours
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

// BUG-H01 / SEC-A01: validate the signing secret at module load so a weak,
// missing, or placeholder AUTH_SECRET fails fast at boot rather than silently
// signing forgeable sessions. Inlined (not importing the zod env module) to
// keep this edge-runtime module dependency-light, but enforces the same rules.
const AUTH_SECRET_PLACEHOLDER = /changeme|insecure|dev-?secret/i;

/** Pure, testable validator. Throws if the secret is unusable. Returns it otherwise. */
export function assertValidAuthSecret(value: string | undefined, isProduction: boolean): string {
  if (!value) {
    throw new Error("AUTH_SECRET environment variable is required");
  }
  if (value.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters of high-entropy value");
  }
  if (isProduction && AUTH_SECRET_PLACEHOLDER.test(value)) {
    throw new Error("AUTH_SECRET is a development placeholder; rotate before deploying.");
  }
  return value;
}

// `next build` evaluates server modules with NODE_ENV=production purely to
// collect page data; the deployment secret is read again at real server boot.
// Enforce presence/length always, but defer the *placeholder* rejection until
// actual runtime serving so a dev placeholder doesn't break the build gate
// while still failing fast at `next start` in production (BUG-H01 / SEC-A01).
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
const authSecret = assertValidAuthSecret(
  process.env.AUTH_SECRET,
  process.env.NODE_ENV === "production" && !isBuildPhase,
);
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
