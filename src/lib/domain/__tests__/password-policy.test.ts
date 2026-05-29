import { describe, it, expect } from "vitest";
import {
  PASSWORD_MIN_LENGTH,
  passwordChecks,
  isPasswordValid,
  passwordStrength,
} from "@/lib/domain/password-policy";

function byId(password: string) {
  return Object.fromEntries(passwordChecks(password).map((c) => [c.id, c.passed]));
}

describe("passwordChecks", () => {
  it("flags a short, simple password correctly per rule", () => {
    const c = byId("abc");
    expect(c.length).toBe(false);
    expect(c.lower).toBe(true);
    expect(c.upper).toBe(false);
    expect(c.number).toBe(false);
    expect(c.special).toBe(false);
  });

  it("passes all checks for a strong password", () => {
    const c = byId("Str0ng!Passw0rd");
    expect(c.length).toBe(true);
    expect(c.lower).toBe(true);
    expect(c.upper).toBe(true);
    expect(c.number).toBe(true);
    expect(c.special).toBe(true);
  });
});

describe("isPasswordValid", () => {
  it("rejects passwords shorter than the minimum length", () => {
    expect(isPasswordValid("Ab1!")).toBe(false);
  });

  it("requires a mix of character classes", () => {
    expect(isPasswordValid("alllowercaseonly")).toBe(false);
    expect(isPasswordValid("Password123!")).toBe(true);
  });

  it("uses the documented minimum length", () => {
    expect(PASSWORD_MIN_LENGTH).toBeGreaterThanOrEqual(8);
  });
});

describe("passwordStrength", () => {
  it("scores weak and strong passwords differently", () => {
    const weak = passwordStrength("abc");
    const strong = passwordStrength("Str0ng!Passw0rd");
    expect(strong.score).toBeGreaterThan(weak.score);
    expect(["weak", "fair", "good", "strong"]).toContain(strong.label);
  });

  it("returns weak for an empty password", () => {
    expect(passwordStrength("").label).toBe("weak");
  });
});
