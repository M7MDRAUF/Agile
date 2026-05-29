import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "../http/origin";

function reqWith(headers: Record<string, string>): Request {
  return new Request("http://example.test/api/export/profile", { headers });
}

describe("env validation", () => {
  it("env module imports without throwing in dev", async () => {
    // AUTH_SECRET is set by the test runner via .env.test or process.env.
    const mod = await import("@/lib/env");
    if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) {
      expect(() => mod.getEnv()).not.toThrow();
    } else {
      expect(() => mod.getEnv()).toThrow(/AUTH_SECRET/);
    }
  });
});

describe("sessionVersion regression", () => {
  it("assertSameOrigin still rejects cross-origin browser GETs", () => {
    const blocked = assertSameOrigin(
      reqWith({ origin: "https://evil.test", host: "example.test" }),
    );
    expect(blocked?.status).toBe(403);
  });
});
