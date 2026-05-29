import bcrypt from "bcryptjs";

// SEC-012: bcrypt cost factor. 12 is the modern OWASP baseline (≈250ms on
// commodity hardware). Existing 10-round hashes remain verifiable via
// bcrypt.compare — only newly issued/rotated passwords use the higher cost.
const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
