import { describe, it, expect, vi } from "vitest";
import { withDbRetry, isTransientDbError } from "@/lib/db-retry";

describe("isTransientDbError", () => {
  it("treats SQLite busy/locked as transient", () => {
    expect(isTransientDbError({ message: "database is locked" })).toBe(true);
    expect(isTransientDbError({ message: "SQLITE_BUSY: database is busy" })).toBe(true);
  });
  it("treats Prisma transient codes as transient", () => {
    expect(isTransientDbError({ code: "P2034" })).toBe(true);
    expect(isTransientDbError({ code: "P1001" })).toBe(true);
  });
  it("treats unique-constraint violation as permanent", () => {
    expect(isTransientDbError({ code: "P2002", message: "unique" })).toBe(false);
  });
  it("treats arbitrary errors as permanent", () => {
    expect(isTransientDbError(new Error("syntax error"))).toBe(false);
    expect(isTransientDbError(null)).toBe(false);
  });
});

describe("withDbRetry", () => {
  it("returns immediately when fn succeeds", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    expect(await withDbRetry(fn)).toBe(42);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient errors and eventually succeeds", async () => {
    let calls = 0;
    const fn = vi.fn(async () => {
      calls++;
      if (calls < 3) throw { message: "database is locked" };
      return "ok";
    });
    const onRetry = vi.fn();
    const res = await withDbRetry(fn, { baseDelayMs: 1, onRetry });
    expect(res).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry permanent errors", async () => {
    const err = { code: "P2002", message: "unique constraint" };
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withDbRetry(fn, { baseDelayMs: 1 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("gives up after maxAttempts and rethrows the last error", async () => {
    const err = { message: "SQLITE_BUSY" };
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withDbRetry(fn, { baseDelayMs: 1, maxAttempts: 2 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
