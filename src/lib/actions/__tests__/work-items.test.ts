import { vi, describe, it, expect, beforeEach } from "vitest";
import { createWorkItem, updateWorkItem } from "@/lib/actions/work-items";

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
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
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

    const mockTx = {
      workItem: {
        findFirst: vi.fn().mockResolvedValue({ key: "CPM-5" }),
        create: vi.fn().mockResolvedValue({ id: "new-item-id", key: "CPM-6" }),
      },
    };
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockTx) => Promise<{ id: string; key: string }>) => fn(mockTx),
    );
    mockPrisma.activityLog.create.mockResolvedValue({});

    const fd = new FormData();
    fd.append("title", "New Work Item");
    fd.append("type", "task");
    fd.append("priority", "medium");
    fd.append("projectId", "proj-1");

    // Act
    const result = await createWorkItem({}, fd);

    // Assert
    expect(result).toEqual({ ok: true });
    // The transaction callback must have derived key "CPM-6" from the last item "CPM-5"
    expect(mockTx.workItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ key: "CPM-6" }),
      }),
    );
    // Activity should be logged after the transaction completes
    expect(mockPrisma.activityLog.create).toHaveBeenCalledWith(
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

    const mockTx = {
      workItem: {
        findFirst: vi.fn().mockResolvedValue(null), // no previous items
        create: vi.fn().mockResolvedValue({ id: "first-item-id", key: "IDP-1" }),
      },
    };
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockTx) => Promise<{ id: string; key: string }>) => fn(mockTx),
    );
    mockPrisma.activityLog.create.mockResolvedValue({});

    const fd = new FormData();
    fd.append("title", "First Work Item Ever");
    fd.append("type", "story");
    fd.append("priority", "high");
    fd.append("projectId", "proj-2");

    // Act
    await createWorkItem({}, fd);

    // Assert — null lastItem → nextNum = 1 → key = "IDP-1"
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
