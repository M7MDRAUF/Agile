import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  updateProfile,
  updatePreferences,
  getUserPreferences,
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from "@/lib/actions/settings";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  user: { update: vi.fn() },
  auditLog: { create: vi.fn() },
  userSetting: { upsert: vi.fn(), findMany: vi.fn() },
  appSetting: { findMany: vi.fn(), upsert: vi.fn() },
}));

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const adminUser = {
  id: "user-admin",
  name: "A",
  email: "a@t.com",
  role: "admin" as const,
  avatarColor: null,
  title: null,
};
const engineerUser = { ...adminUser, id: "user-eng", role: "engineer" as const };

function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("updateProfile", () => {
  it("rejects short names (Zod min(2))", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await updateProfile({}, fd({ name: "X" }));
    expect(res.error).toBe("Name must be at least 2 characters");
  });

  it("updates user, audit-logs, and revalidates /settings", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await updateProfile(
      {},
      fd({ name: "Ada Lovelace", title: "PM", department: "Platform" }),
    );
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: adminUser.id },
      data: { name: "Ada Lovelace", title: "PM", department: "Platform" },
    });
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "profile_update", entityId: adminUser.id }),
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/settings");
  });

  it("normalises empty optional fields to null", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    await updateProfile({}, fd({ name: "Ada Lovelace" }));
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: adminUser.id },
      data: { name: "Ada Lovelace", title: null, department: null },
    });
  });
});

describe("updatePreferences", () => {
  it("rejects unknown preference group", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await updatePreferences({}, fd({ group: "bogus", payload: "{}" }));
    expect(res).toEqual({ error: "Unknown preference group" });
  });

  it("rejects malformed JSON payload", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await updatePreferences({}, fd({ group: "notifications", payload: "not-json{" }));
    expect(res).toEqual({ error: "Malformed preferences" });
  });

  it("upserts a valid preference group and revalidates", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    // Pass an empty payload — schema merges with `defaults` so this passes.
    const res = await updatePreferences({}, fd({ group: "notifications", payload: "{}" }));
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.userSetting.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_key: { userId: adminUser.id, key: "notifications" } },
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/settings");
  });
});

describe("getUserPreferences", () => {
  it("returns parsed preference groups for the user", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.userSetting.findMany.mockResolvedValue([]);
    const res = await getUserPreferences("u-1");
    expect(res).toHaveProperty("notifications");
    expect(res).toHaveProperty("appearance");
    expect(res).toHaveProperty("localization");
  });
});

describe("getWorkspaceSettings", () => {
  it("returns defaults when no rows are persisted", async () => {
    mockPrisma.appSetting.findMany.mockResolvedValue([]);
    const res = await getWorkspaceSettings();
    expect(res.sprintLengthDays).toBe(14);
    expect(res.defaultPriority).toBe("medium");
    expect(res.name).toMatch(/NovaCore/);
  });

  it("merges persisted rows over defaults", async () => {
    mockPrisma.appSetting.findMany.mockResolvedValue([
      { key: "workspace.name", value: "Acme" },
      { key: "workspace.sprintLengthDays", value: "21" },
      { key: "workspace.defaultPriority", value: "high" },
    ]);
    const res = await getWorkspaceSettings();
    expect(res.name).toBe("Acme");
    expect(res.sprintLengthDays).toBe(21);
    expect(res.defaultPriority).toBe("high");
  });

  it("falls back to default when sprintLengthDays is non-numeric", async () => {
    mockPrisma.appSetting.findMany.mockResolvedValue([
      { key: "workspace.sprintLengthDays", value: "abc" },
    ]);
    const res = await getWorkspaceSettings();
    expect(res.sprintLengthDays).toBe(14);
  });
});

describe("updateWorkspaceSettings", () => {
  it("rejects users without settings.manage_workspace", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    const res = await updateWorkspaceSettings(
      {},
      fd({
        name: "Acme",
        slug: "acme",
        sprintLengthDays: "14",
        workingDays: "mon,tue",
        defaultTimezone: "UTC",
        defaultPriority: "medium",
      }),
    );
    expect(res).toEqual({ error: "You cannot manage workspace settings" });
  });

  it("rejects invalid slug (non-lowercase / special chars)", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await updateWorkspaceSettings(
      {},
      fd({
        name: "Acme",
        slug: "ACME!",
        sprintLengthDays: "14",
        workingDays: "mon",
        defaultTimezone: "UTC",
        defaultPriority: "medium",
      }),
    );
    expect(res.error).toMatch(/Slug/);
  });

  it("rejects sprintLengthDays < 1", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await updateWorkspaceSettings(
      {},
      fd({
        name: "Acme",
        slug: "acme",
        sprintLengthDays: "0",
        workingDays: "mon",
        defaultTimezone: "UTC",
        defaultPriority: "medium",
      }),
    );
    expect(res.error).toMatch(/Sprint length/);
  });

  it("upserts all 7 workspace keys, audit-logs, revalidates /settings + /admin", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await updateWorkspaceSettings(
      {},
      fd({
        name: "Acme",
        slug: "acme",
        description: "An org",
        sprintLengthDays: "14",
        workingDays: "mon,tue,wed",
        defaultTimezone: "UTC",
        defaultPriority: "high",
      }),
    );
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.appSetting.upsert).toHaveBeenCalledTimes(7);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "workspace_update" }),
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/settings");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin");
  });
});
