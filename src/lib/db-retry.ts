/**
 * REL-010: Retry helper for transient database errors.
 *
 * Transient failures we want to retry:
 * - SQLite: SQLITE_BUSY (database is locked) when writers contend
 * - Postgres (when we migrate): serialization_failure (40001),
 *   deadlock_detected (40P01), connection issues
 *
 * Permanent failures (constraint violations, missing tables, type errors)
 * are NOT retried — they will fail the same way every time.
 *
 * Default policy: 3 attempts with exponential backoff (50ms, 150ms, 450ms)
 * plus 0–25ms jitter to avoid thundering-herd retries.
 */

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 50;

const TRANSIENT_MESSAGE_PATTERNS = [
  /database is locked/i,
  /SQLITE_BUSY/i,
  /SQLITE_LOCKED/i,
  /serialization_failure/i,
  /deadlock detected/i,
  /connection terminated/i,
  /could not serialize access/i,
];

const TRANSIENT_PRISMA_CODES = new Set([
  "P1001", // can't reach database
  "P1002", // database timed out
  "P1008", // operations timed out
  "P1017", // server closed the connection
  "P2034", // transaction failed (write conflict / deadlock)
]);

export function isTransientDbError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: unknown; message?: unknown };
  if (typeof e.code === "string" && TRANSIENT_PRISMA_CODES.has(e.code)) return true;
  if (typeof e.message === "string") {
    return TRANSIENT_MESSAGE_PATTERNS.some((pat) => pat.test(e.message as string));
  }
  return false;
}

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, err: unknown) => void;
}

/** Run `fn`, retrying on transient DB errors with exponential backoff + jitter. */
export async function withDbRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const baseDelay = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isTransientDbError(err)) throw err;
      opts.onRetry?.(attempt, err);
      const delay = baseDelay * 3 ** (attempt - 1) + Math.floor(Math.random() * 25);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  // Unreachable — loop always returns or throws.
  throw lastErr;
}
