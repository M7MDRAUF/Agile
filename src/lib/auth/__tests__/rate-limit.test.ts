import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { consumeRateLimit, isRateLimited, resetRateLimit } from "@/lib/auth/rate-limit";

describe("rate-limit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Isolate each test's key namespace.
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows attempts up to the limit then blocks", () => {
    const key = `t-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      expect(consumeRateLimit(key, 3, 1000).allowed).toBe(true);
    }
    expect(consumeRateLimit(key, 3, 1000).allowed).toBe(false);
    expect(isRateLimited(key, 3)).toBe(true);
  });

  it("reports remaining attempts", () => {
    const key = `t-${Math.random()}`;
    expect(consumeRateLimit(key, 5, 1000).remaining).toBe(4);
    expect(consumeRateLimit(key, 5, 1000).remaining).toBe(3);
  });

  it("resets after the window elapses", () => {
    const key = `t-${Math.random()}`;
    consumeRateLimit(key, 1, 1000);
    expect(consumeRateLimit(key, 1, 1000).allowed).toBe(false);
    vi.advanceTimersByTime(1001);
    expect(isRateLimited(key, 1)).toBe(false);
    expect(consumeRateLimit(key, 1, 1000).allowed).toBe(true);
  });

  it("does not extend the window on blocked attempts", () => {
    const key = `t-${Math.random()}`;
    consumeRateLimit(key, 1, 1000);
    vi.advanceTimersByTime(500);
    expect(consumeRateLimit(key, 1, 1000).allowed).toBe(false); // blocked, must not push resetAt
    vi.advanceTimersByTime(501); // original window (1000ms) now elapsed
    expect(isRateLimited(key, 1)).toBe(false);
  });

  it("resetRateLimit clears the counter", () => {
    const key = `t-${Math.random()}`;
    consumeRateLimit(key, 1, 1000);
    expect(isRateLimited(key, 1)).toBe(true);
    resetRateLimit(key);
    expect(isRateLimited(key, 1)).toBe(false);
  });
});
