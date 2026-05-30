/**
 * Pure, race-safe helpers for deriving sequential entity keys
 * (work items, test cases, auto-filed bugs).
 *
 * Keys are derived from the maximum numeric suffix already present rather than
 * a row count, so deleting an item never causes a future key to collide. Insert
 * collisions under concurrency are handled by {@link createWithSequentialKey},
 * which retries on a unique-constraint (P2002) violation.
 */

/** Extract the trailing integer from a key such as `PLAT-12` or `PLAT-TC3`. */
export function parseKeySuffix(key: string): number {
  const match = key.match(/(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Given existing keys, return the next sequence number (max suffix + 1). */
export function nextKeyNumber(keys: readonly string[]): number {
  let max = 0;
  for (const key of keys) {
    const n = parseKeySuffix(key);
    if (n > max) max = n;
  }
  return max + 1;
}

/** Canonical work-item key, e.g. `PLAT-42`. */
export function workItemKey(projectKey: string, n: number): string {
  return `${projectKey}-${n}`;
}

/** Canonical test-case key, e.g. `PLAT-TC7`. Shared by seed and runtime. */
export function testCaseKey(projectKey: string, n: number): string {
  return `${projectKey}-TC${n}`;
}

/** Detect a Prisma unique-constraint (P2002) violation. */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/** Detect a Prisma record-not-found (P2025) error. */
export function isNotFoundError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2025"
  );
}

/** Detect a Prisma foreign-key-constraint (P2003) violation. */
export function isForeignKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2003"
  );
}

/**
 * Create an entity with a sequential key, retrying on unique-key collisions.
 *
 * `computeKey` derives the next key from current DB state and `create` performs
 * the insert (optionally inside a transaction). On a P2002 violation the key is
 * recomputed and the insert retried up to `maxAttempts` times.
 */
export async function createWithSequentialKey<T>(
  computeKey: () => Promise<string>,
  create: (key: string) => Promise<T>,
  maxAttempts = 5,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = await computeKey();
    try {
      return await create(key);
    } catch (error) {
      if (!isUniqueConstraintError(error)) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to generate a unique key after multiple attempts");
}
