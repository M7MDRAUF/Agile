import { vi, describe, it, expect, beforeEach } from "vitest";
import { createWorkItem, updateWorkItem, reorderBacklog } from "@/lib/actions/work-items";

// ---------------------------------------------------------------------------
// Hoisted mocks — created before any module is resolved so they can be
// referenced inside the vi.mock factory functions below.
// ---------------------------------------------------------------------------

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(),
  },
  workItem: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
  activityLog: {
    create: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const adminUser = {
  id: "user-admin",
  name: "Admin User",
  email: "admin@test.com",
  role: "admin" as const,
  avatarColor: null,
  title: null,
};

// ---------------------------------------------------------------------------
// updateWorkItem
// ---------------------------------------------------------------------------

describe("updateWorkItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("logs activity with type 'edited' — not 'created'", async () => {
    // Arrange
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findUnique.mockResolvedValue({
      id: "item-1",
      assigneeId: "user-admin",
      reporterId: "user-admin",
    });
    mockPrisma.workItem.update.mockResolvedValue({});
    mockPrisma.activityLog.create.mockResolvedValue({});
    // updateWorkItem now wraps update+activityLog in a transaction; invoke the
    // callback with the same mock client so existing assertions still see calls.
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
      fn(mockPrisma),
    );

    const fd = new FormData();
    fd.append("title", "Updated Work Item Title");
    fd.append("type", "task");
    fd.append("priority", "medium");

    // Act
    const result = await updateWorkItem("item-1", {}, fd);

    // Assert
    expect(result).toEqual({ ok: true });
    expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workItemId: "item-1",
        actorId: "user-admin",
        type: "edited",
        message: "edited the work item details",
      }),
    });
    // Guard: ensure it was NOT called with type "created"
    expect(mockPrisma.activityLog.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "created" }),
    );
  });

  it("returns { error } when work item does not exist", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findUnique.mockResolvedValue(null);
    const fd = new FormData();
    fd.append("title", "Any Title");
    fd.append("type", "task");
    fd.append("priority", "medium");

    const result = await updateWorkItem("missing-id", {}, fd);

    expect(result).toEqual({ error: "Work item not found" });
  });
});

// ---------------------------------------------------------------------------
// createWorkItem — key generation (atomic max-based pattern)
// ---------------------------------------------------------------------------

describe("createWorkItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates key as PROJECT_KEY-{max+1} when items already exist", async () => {
    // Arrange
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.project.findUnique.mockResolvedValue({ id: "proj-1", key: "CPM" });
    // Delete-safe key derivation reads existing keys via findMany (max suffix).
    mockPrisma.workItem.findMany.mockResolvedValue([
      { key: "CPM-1" },
      { key: "CPM-5" },
      { key: "CPM-3" },
    ]);

    const mockTx = {
      workItem: {
        create: vi.fn().mockResolvedValue({ id: "new-item-id", key: "CPM-6" }),
      },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
      notification: { create: vi.fn().mockResolvedValue({}) },
    };
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockTx) => Promise<{ id: string; key: string }>) => fn(mockTx),
    );

    const fd = new FormData();
    fd.append("title", "New Work Item");
    fd.append("type", "task");
    fd.append("priority", "medium");
    fd.append("projectId", "proj-1");

    // Act
    const result = await createWorkItem({}, fd);

    // Assert
    expect(result).toEqual({ ok: true });
    // Key derived from max suffix (CPM-5) + 1 → CPM-6, not count-based.
    expect(mockTx.workItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ key: "CPM-6" }),
      }),
    );
    // Activity is logged inside the same transaction (atomic create).
    expect(mockTx.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workItemId: "new-item-id",
          type: "created",
        }),
      }),
    );
  });

  it("generates key as PROJECT_KEY-1 when no items exist yet", async () => {
    // Arrange
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.project.findUnique.mockResolvedValue({ id: "proj-2", key: "IDP" });
    mockPrisma.workItem.findMany.mockResolvedValue([]); // no previous items

    const mockTx = {
      workItem: {
        create: vi.fn().mockResolvedValue({ id: "first-item-id", key: "IDP-1" }),
      },
      activityLog: { create: vi.fn().mockResolvedValue({}) },
      notification: { create: vi.fn().mockResolvedValue({}) },
    };
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockTx) => Promise<{ id: string; key: string }>) => fn(mockTx),
    );

    const fd = new FormData();
    fd.append("title", "First Work Item Ever");
    fd.append("type", "story");
    fd.append("priority", "high");
    fd.append("projectId", "proj-2");

    // Act
    await createWorkItem({}, fd);

    // Assert — empty keys → nextNum = 1 → key = "IDP-1"
    expect(mockTx.workItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ key: "IDP-1" }),
      }),
    );
  });

  it("returns { error } when project does not exist", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.project.findUnique.mockResolvedValue(null);
    const fd = new FormData();
    fd.append("title", "Work Item Title");
    fd.append("type", "task");
    fd.append("priority", "medium");
    fd.append("projectId", "non-existent-proj");

    const result = await createWorkItem({}, fd);

    expect(result).toEqual({ error: "Project not found" });
  });
});

// ---------------------------------------------------------------------------
// reorderBacklog (BUG-H08)
// ---------------------------------------------------------------------------

describe("reorderBacklog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const stakeholderUser = {
    id: "user-stakeholder",
    name: "Stakeholder User",
    email: "stakeholder@test.com",
    role: "stakeholder" as const,
    avatarColor: null,
    title: null,
  };

  it("rejects callers lacking backlog.prioritize permission", async () => {
    mockRequireUser.mockResolvedValue(stakeholderUser);

    const result = await reorderBacklog("proj-1", ["item-1", "item-2"]);

    expect(result).toEqual({
      error: "You do not have permission to reorder the backlog",
    });
    expect(mockPrisma.workItem.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns an error when the ordered list is empty", async () => {
    mockRequireUser.mockResolvedValue(adminUser);

    const result = await reorderBacklog("proj-1", []);

    expect(result).toEqual({ error: "Nothing to reorder" });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("persists rank by index for items genuinely in the project backlog", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    // Only item-1 and item-2 are owned; item-foreign is filtered out.
    mockPrisma.workItem.findMany.mockResolvedValue([{ id: "item-1" }, { id: "item-2" }]);
    mockPrisma.workItem.update.mockReturnValue({ __op: "update" });
    mockPrisma.$transaction.mockResolvedValue([]);

    const result = await reorderBacklog("proj-1", ["item-2", "item-1", "item-foreign"]);

    expect(result).toEqual({ ok: true });
    // Scoped to this project's backlog only.
    expect(mockPrisma.workItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: "proj-1",
          sprintId: null,
          status: { in: ["backlog", "ready"] },
          id: { in: ["item-2", "item-1", "item-foreign"] },
        }),
      }),
    );
    // item-2 → rank 0, item-1 → rank 1; foreign item never written.
    expect(mockPrisma.workItem.update).toHaveBeenCalledWith({
      where: { id: "item-2" },
      data: { rank: 0 },
    });
    expect(mockPrisma.workItem.update).toHaveBeenCalledWith({
      where: { id: "item-1" },
      data: { rank: 1 },
    });
    expect(mockPrisma.workItem.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "item-foreign" } }),
    );
    expect(mockPrisma.workItem.update).toHaveBeenCalledTimes(2);
  });

  it("returns an error when no submitted ids match the project backlog", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findMany.mockResolvedValue([]);

    const result = await reorderBacklog("proj-1", ["item-x", "item-y"]);

    expect(result).toEqual({ error: "No matching backlog items to reorder" });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });
});
