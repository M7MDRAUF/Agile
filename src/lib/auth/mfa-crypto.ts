import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// BUG-H02 / SEC-A02: TOTP secrets must not be stored in plaintext at rest.
// We encrypt them with AES-256-GCM using a key derived from AUTH_SECRET via
// scrypt. The on-disk format is a self-describing string:
//   v1:<saltB64>:<ivB64>:<tagB64>:<ciphertextB64>
// Decryption is backward-compatible: any value lacking the "v1:" prefix is
// treated as a legacy plaintext secret and returned unchanged, so users
// enrolled before this change (and direct DB seeds in tests) keep working.

const PREFIX = "v1";
const KEY_LEN = 32; // AES-256
const IV_LEN = 12; // GCM standard nonce length
const SALT_LEN = 16;

function deriveKey(salt: Buffer): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // session.ts validates AUTH_SECRET at boot; this is a defensive guard.
    throw new Error("AUTH_SECRET environment variable is required");
  }
  return scryptSync(secret, salt, KEY_LEN);
}

/** Encrypt a TOTP secret for storage. Returns a self-describing string. */
export function encryptMfaSecret(plaintext: string): string {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(salt);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    salt.toString("base64"),
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

/**
 * Decrypt a stored TOTP secret. Legacy plaintext values (no "v1:" prefix) are
 * returned as-is for backward compatibility.
 */
export function decryptMfaSecret(stored: string): string {
  if (!stored.startsWith(`${PREFIX}:`)) {
    return stored; // legacy plaintext
  }
  const parts = stored.split(":");
  if (parts.length !== 5) {
    throw new Error("Malformed encrypted MFA secret");
  }
  const [, saltB64, ivB64, tagB64, dataB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  const key = deriveKey(salt);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
  return plaintext.toString("utf8");
}
