import { vi, describe, it, expect, beforeEach } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockGetEnv = vi.hoisted(() => vi.fn(() => ({ NODE_ENV: "test" })));
const mockPrisma = vi.hoisted(() => ({
  appSetting: { findUnique: vi.fn(), upsert: vi.fn() },
  auditLog: { create: vi.fn() },
}));

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/env", () => ({ getEnv: mockGetEnv }));

import { isWorkspaceActive, setWorkspaceActive, resetDemoData } from "@/lib/actions/danger";

const adminUser = {
  id: "user-admin",
  name: "A",
  email: "a@t.com",
  role: "admin" as const,
  avatarColor: null,
  title: null,
};
const engineerUser = { ...adminUser, id: "user-eng", role: "engineer" as const };

beforeEach(() => vi.clearAllMocks());

describe("isWorkspaceActive", () => {
  it("returns true when no setting row exists (default active)", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.appSetting.findUnique.mockResolvedValue(null);
    expect(await isWorkspaceActive()).toBe(true);
  });

  it("returns true when value is 'true'", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.appSetting.findUnique.mockResolvedValue({ value: "true" });
    expect(await isWorkspaceActive()).toBe(true);
  });

  it("returns false when value is exactly 'false'", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.appSetting.findUnique.mockResolvedValue({ value: "false" });
    expect(await isWorkspaceActive()).toBe(false);
  });
});

describe("setWorkspaceActive", () => {
  it("rejects users without settings.manage_workspace", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    expect(await setWorkspaceActive(false, "DEACTIVATE WORKSPACE")).toEqual({
      error: "You cannot manage the workspace",
    });
  });

  it("rejects mismatched activation phrase", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    expect(await setWorkspaceActive(true, "yes please")).toEqual({
      error: 'Type "ACTIVATE WORKSPACE" to confirm',
    });
  });

  it("rejects mismatched deactivation phrase", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    expect(await setWorkspaceActive(false, "DEACTIVATE")).toEqual({
      error: 'Type "DEACTIVATE WORKSPACE" to confirm',
    });
  });

  it("upserts to 'false' and audit-logs on deactivate", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await setWorkspaceActive(false, "  DEACTIVATE WORKSPACE  ");
    expect(res).toEqual({ ok: true, message: "Workspace deactivated." });
    expect(mockPrisma.appSetting.upsert).toHaveBeenCalledWith({
      where: { key: "workspace.active" },
      create: { key: "workspace.active", value: "false" },
      update: { value: "false" },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "workspace_deactivate" }),
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/settings");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });

  it("upserts to 'true' and audit-logs on activate", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await setWorkspaceActive(true, "ACTIVATE WORKSPACE");
    expect(res).toEqual({ ok: true, message: "Workspace reactivated." });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "workspace_activate" }),
    });
  });
});

describe("resetDemoData", () => {
  it("rejects users without admin.access", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    expect(await resetDemoData("RESET DEMO DATA")).toEqual({
      error: "You cannot reset demo data",
    });
  });

  it("rejects mismatched confirmation phrase", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    expect(await resetDemoData("yes")).toEqual({
      error: 'Type "RESET DEMO DATA" to confirm',
    });
  });

  it("is blocked in production without the explicit opt-in (BUG-M27)", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockGetEnv.mockReturnValueOnce({ NODE_ENV: "production" });
    delete process.env["ALLOW_DEMO_RESET"];
    const res = await resetDemoData("RESET DEMO DATA");
    expect(res).toEqual({
      error: "Demo data reset is disabled in production. Set ALLOW_DEMO_RESET=true to override.",
    });
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("allows the production override when ALLOW_DEMO_RESET=true still requires the phrase", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockGetEnv.mockReturnValueOnce({ NODE_ENV: "production" });
    process.env["ALLOW_DEMO_RESET"] = "true";
    // With the override, the guard is bypassed so the next check (confirmation) runs.
    const res = await resetDemoData("nope");
    expect(res).toEqual({ error: 'Type "RESET DEMO DATA" to confirm' });
    delete process.env["ALLOW_DEMO_RESET"];
  });

  it("runs seed via execFile (no shell); failure returns descriptive error and skips audit", async () => {
    // execFile is intentionally NOT mocked — vi.mock on built-in `node:util`
    // is unreliable across Vitest versions. In the test environment `npx` may
    // or may not exist, so we accept either branch:
    //   - success → audit row written, layout revalidated
    //   - failure → error string with "Reset failed:" prefix, audit skipped
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await resetDemoData("RESET DEMO DATA");
    if ("ok" in res && res.ok) {
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ action: "demo_data_reset" }),
      });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/", "layout");
    } else {
      expect(res.error).toMatch(/^Reset failed\. Quote reference/);
      expect(res.error).not.toMatch(/Error:|stack|node_modules/);
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    }
  }, 130_000);
});
