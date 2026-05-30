import { describe, expect, it } from "vitest";
import { encryptMfaSecret, decryptMfaSecret } from "../mfa-crypto";

// BUG-H02 / SEC-A02: TOTP secrets are encrypted at rest with AES-256-GCM.
describe("mfa-crypto", () => {
  const secret = "JBSWY3DPEHPK3PXP";

  it("round-trips a secret through encrypt/decrypt", () => {
    const enc = encryptMfaSecret(secret);
    expect(enc).not.toBe(secret);
    expect(enc.startsWith("v1:")).toBe(true);
    expect(decryptMfaSecret(enc)).toBe(secret);
  });

  it("produces a different ciphertext each time (random salt+iv)", () => {
    expect(encryptMfaSecret(secret)).not.toBe(encryptMfaSecret(secret));
  });

  it("treats legacy plaintext (no v1 prefix) as-is for backward compatibility", () => {
    expect(decryptMfaSecret(secret)).toBe(secret);
  });

  it("rejects a tampered ciphertext", () => {
    const enc = encryptMfaSecret(secret);
    const parts = enc.split(":");
    const data = Buffer.from(parts[4], "base64");
    data[0] ^= 0xff;
    parts[4] = data.toString("base64");
    expect(() => decryptMfaSecret(parts.join(":"))).toThrow();
  });

  it("rejects a malformed encrypted payload", () => {
    expect(() => decryptMfaSecret("v1:onlytwo")).toThrow(/Malformed/);
  });
});
