import { vi, describe, it, expect, beforeEach } from "vitest";
import { authenticator } from "otplib";
import {
  confirmMfa,
  beginMfaSetup,
  disableMfa,
  changePassword,
  revokeSession,
  revokeOtherSessions,
} from "@/lib/actions/security";
import { getSession } from "@/lib/auth/current-user";
import { decryptMfaSecret } from "@/lib/auth/mfa-crypto";
import { verifyPassword } from "@/lib/auth/password";

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
  userSession: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
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
    // BUG-H02: the secret must be encrypted at rest, not stored as plaintext.
    expect(updateArg.data.mfaSecret).not.toBe(secret);
    expect(updateArg.data.mfaSecret.startsWith("v1:")).toBe(true);
    expect(decryptMfaSecret(updateArg.data.mfaSecret)).toBe(secret);
    // Recovery codes must be stored hashed, never plaintext.
    for (const plain of res.recoveryCodes!) {
      expect(updateArg.data.mfaRecoveryCodes).not.toContain(plain);
    }
    expect(updateArg.data.mfaRecoveryCodes.split("\n").length).toBe(8);
  });
});

describe("disableMfa", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires the current password (BUG-L03 reauth)", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.user.findUnique.mockResolvedValue({ id: adminUser.id, passwordHash: "h" });
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const res = await disableMfa("wrong-password");
    expect(res.error).toMatch(/current password/i);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects when no password is supplied", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.user.findUnique.mockResolvedValue({ id: adminUser.id, passwordHash: "h" });
    const res = await disableMfa();
    expect(res.error).toMatch(/current password/i);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("clears mfaSecret and mfaRecoveryCodes after reauth", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.user.findUnique.mockResolvedValue({ id: adminUser.id, passwordHash: "h" });
    vi.mocked(verifyPassword).mockResolvedValue(true);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});
    const res = await disableMfa("correct-password");
    expect(res.ok).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: null },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// changePassword (BUG-H15)
// ---------------------------------------------------------------------------

describe("changePassword", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeForm = (current: string, next: string, confirm: string) => {
    const fd = new FormData();
    fd.append("currentPassword", current);
    fd.append("newPassword", next);
    fd.append("confirmPassword", confirm);
    return fd;
  };

  it("rejects when confirmation does not match", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await changePassword({}, makeForm("Old", "NewStr0ng!Pass", "Different!1A"));
    expect(res.error).toBe("New password and confirmation do not match");
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a new password that fails the strength policy", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await changePassword({}, makeForm("Old", "weak", "weak"));
    expect(res.error).toMatch(/strength requirements/i);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects when the current password is incorrect", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.user.findUnique.mockResolvedValue({ id: adminUser.id, passwordHash: "stored" });
    vi.mocked(verifyPassword).mockResolvedValue(false);
    const res = await changePassword({}, makeForm("wrong", "NewStr0ng!Pass1", "NewStr0ng!Pass1"));
    expect(res.error).toBe("Your current password is incorrect");
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects when the new password equals the current password", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.user.findUnique.mockResolvedValue({ id: adminUser.id, passwordHash: "stored" });
    // First call (current) → valid; second call (new vs stored) → also valid (same).
    vi.mocked(verifyPassword).mockResolvedValue(true);
    const res = await changePassword(
      {},
      makeForm("NewStr0ng!Pass1", "NewStr0ng!Pass1", "NewStr0ng!Pass1"),
    );
    expect(res.error).toBe("New password must differ from the current password");
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("updates the password hash and writes an audit log on success", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.user.findUnique.mockResolvedValue({ id: adminUser.id, passwordHash: "stored" });
    // current → valid, new-vs-stored → not the same.
    vi.mocked(verifyPassword).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    mockPrisma.user.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});
    const res = await changePassword(
      {},
      makeForm("OldStr0ng!Pass1", "NewStr0ng!Pass1", "NewStr0ng!Pass1"),
    );
    expect(res.ok).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(1);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "password_change", actorId: adminUser.id }),
    });
  });
});

// ---------------------------------------------------------------------------
// revokeSession / revokeOtherSessions (BUG-H15)
// ---------------------------------------------------------------------------

describe("revokeSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses to revoke a session that belongs to another user", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.userSession.findUnique.mockResolvedValue({ id: "s-1", userId: "someone-else" });
    const res = await revokeSession("s-1");
    expect(res).toEqual({ error: "Session not found" });
    expect(mockPrisma.userSession.update).not.toHaveBeenCalled();
  });

  it("refuses to revoke a non-existent session", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.userSession.findUnique.mockResolvedValue(null);
    expect(await revokeSession("missing")).toEqual({ error: "Session not found" });
  });

  it("stamps revokedAt for the caller's own session", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.userSession.findUnique.mockResolvedValue({ id: "s-1", userId: adminUser.id });
    mockPrisma.userSession.update.mockResolvedValue({});
    const res = await revokeSession("s-1");
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.userSession.update).toHaveBeenCalledWith({
      where: { id: "s-1" },
      data: { revokedAt: expect.any(Date) },
    });
  });
});

describe("revokeOtherSessions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("revokes all of the user's sessions except the one currently in use", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    vi.mocked(getSession).mockResolvedValue({
      userId: adminUser.id,
      email: adminUser.email,
      name: adminUser.name,
      role: "admin",
      sid: "current-sid",
    });
    mockPrisma.userSession.updateMany.mockResolvedValue({ count: 3 });
    mockPrisma.auditLog.create.mockResolvedValue({});
    const res = await revokeOtherSessions();
    expect(res).toEqual({ ok: true, count: 3 });
    expect(mockPrisma.userSession.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: adminUser.id,
        revokedAt: null,
        id: { not: "current-sid" },
      }),
      data: { revokedAt: expect.any(Date) },
    });
  });
});
