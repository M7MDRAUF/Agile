import { describe, it, expect, vi, beforeEach } from "vitest";
import { changeUserRole, toggleUserStatus } from "@/lib/actions/admin";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn() },
}));
const mockRevalidate = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mockRequireUser }));
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
});
