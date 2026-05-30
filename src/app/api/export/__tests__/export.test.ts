import { vi, describe, it, expect, beforeEach } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  workItem: { findMany: vi.fn(), count: vi.fn() },
  user: { findUnique: vi.fn() },
  comment: { count: vi.fn() },
}));
const mockGetUserPreferences = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/guards", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/actions/settings", () => ({
  getUserPreferences: mockGetUserPreferences,
}));

const adminUser = {
  id: "user-admin",
  name: "Admin",
  email: "a@t.com",
  role: "admin" as const,
  avatarColor: null,
  title: null,
};
const engineerUser = { ...adminUser, id: "user-eng", role: "engineer" as const };

beforeEach(() => vi.clearAllMocks());

function makeReq(url: string, headers: Record<string, string> = {}) {
  return new Request(url, { headers });
}

// --- /api/export/workspace --------------------------------------------------

describe("GET /api/export/workspace (SEC-007 + PERF-002 + perms)", () => {
  it("rejects cross-origin browser requests with 403", async () => {
    const { GET } = await import("@/app/api/export/workspace/route");
    const res = await GET(
      makeReq("http://localhost:3000/api/export/workspace", {
        origin: "https://evil.example",
        host: "localhost:3000",
      }),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/Cross-origin/);
    expect(mockRequireUser).not.toHaveBeenCalled();
  });

  it("rejects non-admin roles with 403 (settings.manage_workspace gate)", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    const { GET } = await import("@/app/api/export/workspace/route");
    const res = await GET(makeReq("http://localhost:3000/api/export/workspace"));
    expect(res.status).toBe(403);
  });

  it("returns CSV by default with no-store cache header", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findMany.mockResolvedValue([
      {
        key: "PLAT-1",
        title: "First",
        type: "story",
        status: "done",
        priority: "high",
        storyPoints: 3,
        project: { key: "PLAT" },
        assignee: { name: "Ada" },
        createdAt: new Date("2026-01-01T00:00:00Z"),
        completedAt: new Date("2026-01-05T00:00:00Z"),
      },
    ]);
    const { GET } = await import("@/app/api/export/workspace/route");
    const res = await GET(makeReq("http://localhost:3000/api/export/workspace"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/csv");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("content-disposition")).toMatch(/agileforge-workspace-report\.csv/);
    const text = await res.text();
    expect(text.split("\n")[0]).toContain("key,title,type,status,priority");
    expect(text).toContain("PLAT-1");
    expect(text).toContain("Ada");
  });

  it("returns JSON when ?format=json with truncated=false when under cap", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findMany.mockResolvedValue([
      {
        key: "PLAT-1",
        title: "First",
        type: "story",
        status: "done",
        priority: "high",
        storyPoints: null,
        project: { key: "PLAT" },
        assignee: null,
        createdAt: new Date("2026-01-01T00:00:00Z"),
        completedAt: null,
      },
    ]);
    const { GET } = await import("@/app/api/export/workspace/route");
    const res = await GET(makeReq("http://localhost:3000/api/export/workspace?format=json"));
    expect(res.headers.get("content-type")).toBe("application/json");
    const body = (await res.json()) as { truncated: boolean; count: number; rows: unknown[] };
    expect(body.truncated).toBe(false);
    expect(body.count).toBe(1);
    expect(res.headers.get("x-export-truncated")).toBeNull();
  });

  it("PERF-002: clamps ?limit to 50000 cap and sets X-Export-Truncated when full", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    // Return exactly `take` rows so truncated = true.
    const rows = Array.from({ length: 5 }, (_, i) => ({
      key: `PLAT-${i + 1}`,
      title: `Item ${i + 1}`,
      type: "story",
      status: "todo",
      priority: "medium",
      storyPoints: null,
      project: { key: "PLAT" },
      assignee: null,
      createdAt: new Date(),
      completedAt: null,
    }));
    mockPrisma.workItem.findMany.mockResolvedValue(rows);
    const { GET } = await import("@/app/api/export/workspace/route");
    const res = await GET(
      makeReq("http://localhost:3000/api/export/workspace?limit=5&format=json"),
    );
    expect(mockPrisma.workItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    expect(res.headers.get("x-export-truncated")).toBe("true; cap=5");
  });

  it("PERF-002: ignores invalid ?limit and falls back to hard cap", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findMany.mockResolvedValue([]);
    const { GET } = await import("@/app/api/export/workspace/route");
    await GET(makeReq("http://localhost:3000/api/export/workspace?limit=-99&format=json"));
    expect(mockPrisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50_000 }),
    );
  });
});

// --- /api/export/profile ----------------------------------------------------

describe("GET /api/export/profile (SEC-007 + own-data export)", () => {
  it("rejects cross-origin browser requests with 403", async () => {
    const { GET } = await import("@/app/api/export/profile/route");
    const res = await GET(
      makeReq("http://localhost:3000/api/export/profile", {
        origin: "https://evil.example",
        host: "localhost:3000",
      }),
    );
    expect(res.status).toBe(403);
    expect(mockRequireUser).not.toHaveBeenCalled();
  });

  it("returns the caller's own profile + stats + preferences as JSON", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: engineerUser.id,
      email: engineerUser.email,
      name: "Eng",
      role: "engineer",
      title: null,
      department: null,
      status: "active",
      mfaEnabled: false,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    });
    mockPrisma.workItem.count
      .mockResolvedValueOnce(7) // assigned
      .mockResolvedValueOnce(3); // reported
    mockPrisma.comment.count.mockResolvedValue(11);
    mockGetUserPreferences.mockResolvedValue({
      notifications: {},
      appearance: {},
      localization: {},
    });
    const { GET } = await import("@/app/api/export/profile/route");
    const res = await GET(makeReq("http://localhost:3000/api/export/profile"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("content-disposition")).toMatch(
      new RegExp(`agileforge-profile-${engineerUser.id}\\.json`),
    );
    const body = (await res.json()) as {
      profile: { id: string };
      stats: { assignedWorkItems: number; reportedWorkItems: number; comments: number };
    };
    expect(body.profile.id).toBe(engineerUser.id);
    expect(body.stats).toEqual({
      assignedWorkItems: 7,
      reportedWorkItems: 3,
      comments: 11,
    });
    // Confirm the user-scoped queries — no other user's data is leaked.
    expect(mockPrisma.workItem.count).toHaveBeenCalledWith({
      where: { assigneeId: engineerUser.id },
    });
    expect(mockPrisma.workItem.count).toHaveBeenCalledWith({
      where: { reporterId: engineerUser.id },
    });
    expect(mockPrisma.comment.count).toHaveBeenCalledWith({
      where: { authorId: engineerUser.id },
    });
  });

  it("allows same-origin browser requests through", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: engineerUser.id,
      email: engineerUser.email,
      name: "Eng",
      role: "engineer",
      title: null,
      department: null,
      status: "active",
      mfaEnabled: false,
      createdAt: new Date(),
    });
    mockPrisma.workItem.count.mockResolvedValue(0);
    mockPrisma.comment.count.mockResolvedValue(0);
    mockGetUserPreferences.mockResolvedValue({
      notifications: {},
      appearance: {},
      localization: {},
    });
    const { GET } = await import("@/app/api/export/profile/route");
    const res = await GET(
      makeReq("http://localhost:3000/api/export/profile", {
        origin: "http://localhost:3000",
        host: "localhost:3000",
      }),
    );
    expect(res.status).toBe(200);
  });
});
