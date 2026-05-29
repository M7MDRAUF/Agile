// Pure password policy + strength scoring. Shared by the change-password
// server action and the client strength meter so rules never drift.

export interface PasswordCheck {
  id: string;
  label: string;
  passed: boolean;
}

export const PASSWORD_MIN_LENGTH = 10;

/** Evaluate a password against the policy, returning each rule's status. */
export function passwordChecks(password: string): PasswordCheck[] {
  return [
    {
      id: "length",
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      passed: password.length >= PASSWORD_MIN_LENGTH,
    },
    { id: "lower", label: "A lowercase letter", passed: /[a-z]/.test(password) },
    { id: "upper", label: "An uppercase letter", passed: /[A-Z]/.test(password) },
    { id: "number", label: "A number", passed: /[0-9]/.test(password) },
    {
      id: "special",
      label: "A special character",
      passed: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

/** True when every policy rule passes. */
export function isPasswordValid(password: string): boolean {
  return passwordChecks(password).every((c) => c.passed);
}

export type PasswordStrength = "weak" | "fair" | "good" | "strong";

/** Map the number of satisfied rules to a coarse strength label (0–4 score). */
export function passwordStrength(password: string): {
  score: number;
  label: PasswordStrength;
} {
  if (!password) return { score: 0, label: "weak" };
  const passed = passwordChecks(password).filter((c) => c.passed).length;
  // Bonus point for longer passwords.
  const lengthBonus = password.length >= 14 ? 1 : 0;
  const score = Math.min(4, Math.max(1, passed - 1 + lengthBonus));
  const label: PasswordStrength =
    score <= 1 ? "weak" : score === 2 ? "fair" : score === 3 ? "good" : "strong";
  return { score, label };
}
