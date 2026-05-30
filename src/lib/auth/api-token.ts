import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import type { Role } from "@/lib/domain/constants";

export type ApiTokenScope = "read" | "write" | "admin";

export interface AuthenticatedApiToken {
  tokenId: string;
  userId: string;
  role: Role;
  scopes: ApiTokenScope[];
}

const PREFIX_LEN = 12;

/**
 * Authenticate a request using a developer API token (BUG-M01).
 *
 * Tokens are presented as `Authorization: Bearer agf_…`. We look the token up
 * by its non-secret prefix, verify the full value against the stored bcrypt
 * hash, and reject revoked or expired tokens. On success `lastUsedAt` is
 * stamped so the owner can audit usage from Settings.
 *
 * Returns `null` when no usable token is present so callers can fall back to
 * cookie-session auth.
 */
export async function authenticateApiToken(
  request: Request,
): Promise<AuthenticatedApiToken | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const raw = header.slice("Bearer ".length).trim();
  if (!raw.startsWith("agf_") || raw.length < PREFIX_LEN + 8) return null;

  const prefix = raw.slice(0, PREFIX_LEN);
  const candidate = await prisma.apiToken.findFirst({
    where: { prefix, revokedAt: null },
    include: { user: true },
  });
  if (!candidate) return null;

  if (candidate.expiresAt && candidate.expiresAt.getTime() <= Date.now()) return null;
  if (candidate.user.status !== "active") return null;

  const ok = await verifyPassword(raw, candidate.tokenHash);
  if (!ok) return null;

  await prisma.apiToken
    .update({ where: { id: candidate.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);

  const scopes = candidate.scopes
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is ApiTokenScope => s === "read" || s === "write" || s === "admin");

  return {
    tokenId: candidate.id,
    userId: candidate.userId,
    role: candidate.user.role as Role,
    scopes,
  };
}

/** True when the token grants the requested scope (admin implies everything). */
export function tokenHasScope(token: AuthenticatedApiToken, scope: ApiTokenScope): boolean {
  return token.scopes.includes("admin") || token.scopes.includes(scope);
}
