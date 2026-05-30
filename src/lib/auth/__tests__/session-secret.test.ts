import { describe, expect, it } from "vitest";
import { assertValidAuthSecret } from "../session";

// BUG-H01 / SEC-A01: the signing secret must be validated, not merely present.
describe("assertValidAuthSecret", () => {
  const strong = "a".repeat(48);

  it("accepts a sufficiently long secret", () => {
    expect(assertValidAuthSecret(strong, false)).toBe(strong);
    expect(assertValidAuthSecret(strong, true)).toBe(strong);
  });

  it("rejects a missing secret", () => {
    expect(() => assertValidAuthSecret(undefined, false)).toThrow(/required/i);
    expect(() => assertValidAuthSecret("", true)).toThrow(/required/i);
  });

  it("rejects a short secret", () => {
    expect(() => assertValidAuthSecret("too-short", false)).toThrow(/32 characters/i);
  });

  it("rejects placeholder secrets in production", () => {
    expect(() => assertValidAuthSecret(`changeme-${"x".repeat(40)}`, true)).toThrow(/placeholder/i);
    expect(() => assertValidAuthSecret(`insecure-${"x".repeat(40)}`, true)).toThrow(/placeholder/i);
    expect(() => assertValidAuthSecret(`dev-secret-${"x".repeat(40)}`, true)).toThrow(
      /placeholder/i,
    );
  });

  it("allows placeholder-looking secrets outside production", () => {
    const devSecret = `dev-secret-${"x".repeat(40)}`;
    expect(assertValidAuthSecret(devSecret, false)).toBe(devSecret);
  });
});
