import { vi, describe, it, expect, beforeEach } from "vitest";
import { authenticator } from "otplib";
import { confirmMfa, beginMfaSetup, disableMfa } from "@/lib/actions/security";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockHashPassword = vi.hoisted(() =>
  vi.fn(async (s: string) => {
    // Simulate bcrypt: produce an opaque hash that does NOT contain the plaintext.
    // We hash via a simple deterministic transformation purely for the test.
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return `$2b$10$${Math.abs(h).toString(36)}xxxxxxxxxxxxxxxxxxxxxx`;
  }),
);
const mockPrisma = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  auditLog: { create: vi.fn() },
}));

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/auth/current-user", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth/password", () => ({
  hashPassword: mockHashPassword,
  verifyPassword: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const adminUser = {
  id: "user-admin",
  email: "admin@test.com",
  name: "Admin User",
  role: "admin" as const,
};

describe("beginMfaSetup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a usable base32 TOTP secret and otpauth URL", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const state = await beginMfaSetup();
    expect(state.secret).toBeDefined();
    expect(state.secret!.length).toBeGreaterThanOrEqual(16);
    expect(state.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    // The returned secret must produce a valid TOTP that verifies against itself.
    const code = authenticator.generate(state.secret!);
    expect(authenticator.verify({ token: code, secret: state.secret! })).toBe(true);
  });
});

describe("confirmMfa", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects a malformed code", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const fd = new FormData();
    fd.append("code", "abc");
    fd.append("secret", "JBSWY3DPEHPK3PXP"); // valid base32
    const res = await confirmMfa({}, fd);
    expect(res.error).toBeDefined();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a secret that is too short", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const fd = new FormData();
    fd.append("code", "123456");
    fd.append("secret", "SHORT");
    const res = await confirmMfa({}, fd);
    expect(res.error).toBeDefined();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid 6-digit code (fake-MFA regression guard)", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const secret = authenticator.generateSecret(20);
    const fd = new FormData();
    fd.append("code", "000000"); // overwhelmingly unlikely to match
    fd.append("secret", secret);
    const res = await confirmMfa({}, fd);
    // If MFA is fake, this would still succeed. The fix requires a real reject.
    expect(res.error).toBe("That code is invalid. Try the latest 6-digit code.");
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("accepts a valid TOTP, hashes recovery codes, and persists", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});
    const secret = authenticator.generateSecret(20);
    const token = authenticator.generate(secret);

    const fd = new FormData();
    fd.append("code", token);
    fd.append("secret", secret);
    const res = await confirmMfa({}, fd);

    expect(res.ok).toBe(true);
    expect(res.recoveryCodes).toBeDefined();
    expect(res.recoveryCodes!.length).toBe(8);
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
    const updateArg = mockPrisma.user.update.mock.calls[0][0] as {
      data: { mfaEnabled: boolean; mfaSecret: string; mfaRecoveryCodes: string };
    };
    expect(updateArg.data.mfaEnabled).toBe(true);
    expect(updateArg.data.mfaSecret).toBe(secret);
    // Recovery codes must be stored hashed, never plaintext.
    for (const plain of res.recoveryCodes!) {
      expect(updateArg.data.mfaRecoveryCodes).not.toContain(plain);
    }
    expect(updateArg.data.mfaRecoveryCodes.split("\n").length).toBe(8);
  });
});

describe("disableMfa", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears mfaSecret and mfaRecoveryCodes", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});
    const res = await disableMfa();
    expect(res.ok).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: null },
      }),
    );
  });
});
