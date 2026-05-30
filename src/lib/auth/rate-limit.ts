/**
 * Centralised fixed-window rate limiter (BUG-M02 / BUG-M09).
 *
 * A single module backs every throttled flow (password login *and* MFA code
 * verification) so the policy lives in one place instead of being duplicated
 * inline per action. The backing store is an in-process `Map`, which is correct
 * for the single-process SQLite demo deployment but does NOT coordinate across
 * multiple instances or survive a cold start.
 *
 * To run multiple replicas, swap {@link RateLimitStore} for a shared backend
 * (Redis / Upstash / a `RateLimit` table) — the call sites do not change.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitStore {
  get(key: string): RateLimitEntry | undefined;
  set(key: string, entry: RateLimitEntry): void;
  delete(key: string): void;
}

class InMemoryRateLimitStore implements RateLimitStore {
  private readonly map = new Map<string, RateLimitEntry>();
  get(key: string) {
    return this.map.get(key);
  }
  set(key: string, entry: RateLimitEntry) {
    this.map.set(key, entry);
  }
  delete(key: string) {
    this.map.delete(key);
  }
}

const store: RateLimitStore = new InMemoryRateLimitStore();

export interface RateLimitResult {
  /** True when the request is allowed (under the limit). */
  allowed: boolean;
  /** Remaining attempts in the current window once the limit is reached. */
  remaining: number;
}

/**
 * Records an attempt against `key` and reports whether it is allowed.
 *
 * A fixed window of `windowMs` permits up to `max` attempts. Once the limit is
 * exceeded the window holds until it naturally expires (it is NOT extended by
 * further blocked attempts, preventing an attacker from locking a victim out
 * indefinitely).
 */
export function consumeRateLimit(key: string, max: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = store.get(key);

  if (!current || now >= current.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  if (current.count >= max) {
    return { allowed: false, remaining: 0 };
  }

  const next = current.count + 1;
  store.set(key, { count: next, resetAt: current.resetAt });
  return { allowed: true, remaining: Math.max(0, max - next) };
}

/** Clears the counter for `key` (e.g. after a successful authentication). */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/** Reports whether `key` is currently over its limit without recording a hit. */
export function isRateLimited(key: string, max: number): boolean {
  const current = store.get(key);
  if (!current || Date.now() >= current.resetAt) return false;
  return current.count >= max;
}
