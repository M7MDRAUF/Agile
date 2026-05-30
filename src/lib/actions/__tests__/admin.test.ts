import { describe, it, expect, vi, beforeEach } from "vitest";
import { changeUserRole, toggleUserStatus, createUser } from "@/lib/actions/admin";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn(), count: vi.fn(), create: vi.fn() },
  auditLog: { create: vi.fn() },
}));
const mockRevalidate = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/auth/password", () => ({ hashPassword: vi.fn(async () => "hashed-pw") }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const admin = { id: "admin-1", name: "Admin", email: "a@x.test", role: "admin" as const };
const nonAdmin = { id: "eng-1", name: "Eng", email: "e@x.test", role: "engineer" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("admin.changeUserRole", () => {
  it("blocks non-admins (RBAC)", async () => {
    mockRequireUser.mockResolvedValue(nonAdmin);
    const res = await changeUserRole("u", "engineering_manager");
    expect(res.error).toBe("Not permitted");
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects invalid role values", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u", role: "engineer", sessionVersion: 0 });
    const res = await changeUserRole("u", "wizard");
    expect(res.error).toBe("Invalid role");
  });

  it("SEC-013: bumps sessionVersion on role change", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u", role: "engineer", sessionVersion: 3 });
    mockPrisma.user.update.mockResolvedValue({});
    const res = await changeUserRole("u", "engineering_manager");
    expect(res.ok).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u" },
      data: { role: "engineering_manager", sessionVersion: { increment: 1 } },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalled();
  });

  it("BUG-M05: blocks demoting the last active administrator", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u", role: "admin", status: "active" });
    mockPrisma.user.count.mockResolvedValue(1);
    const res = await changeUserRole("u", "engineer");
    expect(res.error).toMatch(/last active administrator/);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("BUG-M05: allows demoting an admin when others remain", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u", role: "admin", status: "active" });
    mockPrisma.user.count.mockResolvedValue(2);
    mockPrisma.user.update.mockResolvedValue({});
    const res = await changeUserRole("u", "engineer");
    expect(res.ok).toBe(true);
    expect(mockPrisma.user.update).toHaveBeenCalled();
  });
});

describe("admin.toggleUserStatus", () => {
  it("blocks non-admins", async () => {
    mockRequireUser.mockResolvedValue(nonAdmin);
    const res = await toggleUserStatus("u");
    expect(res.error).toBe("Not permitted");
  });

  it("blocks self-deactivation", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: admin.id,
      status: "active",
      sessionVersion: 0,
    });
    const res = await toggleUserStatus(admin.id);
    expect(res.error).toMatch(/cannot deactivate yourself/);
  });

  it("SEC-013: bumps sessionVersion on deactivation only", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u", status: "active", sessionVersion: 1 });
    mockPrisma.user.update.mockResolvedValue({});
    await toggleUserStatus("u");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u" },
      data: { status: "inactive", sessionVersion: { increment: 1 } },
    });
  });

  it("does NOT bump sessionVersion on reactivation", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u",
      status: "inactive",
      sessionVersion: 5,
    });
    mockPrisma.user.update.mockResolvedValue({});
    await toggleUserStatus("u");
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "u" },
      data: { status: "active" },
    });
  });

  it("BUG-M05: blocks deactivating the last active administrator", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "other-admin",
      role: "admin",
      status: "active",
      sessionVersion: 0,
    });
    mockPrisma.user.count.mockResolvedValue(1);
    const res = await toggleUserStatus("other-admin");
    expect(res.error).toMatch(/last active administrator/);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });
});

describe("admin.createUser (BUG-M29)", () => {
  const makeForm = (over: Record<string, string> = {}) => {
    const fd = new FormData();
    fd.append("email", over.email ?? "New.User@Test.com");
    fd.append("name", over.name ?? "New User");
    fd.append("password", over.password ?? "Password123!");
    fd.append("role", over.role ?? "engineer");
    if (over.title) fd.append("title", over.title);
    return fd;
  };

  it("blocks callers without user.manage", async () => {
    mockRequireUser.mockResolvedValue(nonAdmin);
    const res = await createUser({}, makeForm());
    expect(res.error).toBe("Not permitted");
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects invalid input (bad email)", async () => {
    mockRequireUser.mockResolvedValue(admin);
    const res = await createUser({}, makeForm({ email: "not-an-email" }));
    expect(res.error).toBeDefined();
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "existing" });
    const res = await createUser({}, makeForm());
    expect(res.error).toBe("A user with that email already exists");
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it("normalizes the email to lowercase and persists a hashed password", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "u-new",
      email: "new.user@test.com",
      role: "engineer",
    });
    mockPrisma.auditLog.create.mockResolvedValue({});
    const res = await createUser({}, makeForm());
    expect(res.ok).toBe(true);
    expect(res.id).toBe("u-new");
    // Uniqueness lookup uses the normalized (lowercased + trimmed) email.
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "new.user@test.com" },
    });
    const createArg = mockPrisma.user.create.mock.calls[0][0] as {
      data: { email: string; passwordHash: string };
    };
    expect(createArg.data.email).toBe("new.user@test.com");
    expect(createArg.data.passwordHash).toBe("hashed-pw");
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "user_create" }),
    });
  });
});
