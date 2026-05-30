import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  updateWorkItemStatus,
  assignWorkItem,
  addComment,
  createBlocker,
  resolveBlocker,
} from "@/lib/actions/work-items";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  workItem: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  comment: {
    create: vi.fn(),
  },
  blocker: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
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

const adminUser = {
  id: "user-admin",
  name: "Admin",
  email: "admin@test.com",
  role: "admin" as const,
  avatarColor: null,
  title: null,
};

const stakeholderUser = {
  id: "user-sh",
  name: "Stakeholder",
  email: "sh@test.com",
  role: "stakeholder" as const,
  avatarColor: null,
  title: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Run every $transaction callback against the same mock client.
  mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
    fn(mockPrisma),
  );
});

// ---------------------------------------------------------------------------
// updateWorkItemStatus
// ---------------------------------------------------------------------------

describe("updateWorkItemStatus", () => {
  it("rejects an invalid status value", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    expect(await updateWorkItemStatus("w-1", "nonsense")).toEqual({ error: "Invalid status" });
    expect(mockPrisma.workItem.findUnique).not.toHaveBeenCalled();
  });

  it("returns not found when the item does not exist", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findUnique.mockResolvedValue(null);
    expect(await updateWorkItemStatus("missing", "in_progress")).toEqual({
      error: "Work item not found",
    });
  });

  it("blocks a forbidden status transition (backlog → done)", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findUnique.mockResolvedValue({
      id: "w-1",
      status: "backlog",
      assigneeId: null,
      reporterId: null,
    });
    const res = await updateWorkItemStatus("w-1", "done");
    expect(res).toEqual({ error: "Cannot move from backlog to done" });
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("allows a valid transition and stamps completedAt when moving to done", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findUnique.mockResolvedValue({
      id: "w-1",
      key: "CPM-1",
      status: "in_progress",
      assigneeId: null,
      reporterId: null,
      completedAt: null,
    });
    const res = await updateWorkItemStatus("w-1", "done");
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.workItem.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "w-1" },
        data: expect.objectContaining({ status: "done", completedAt: expect.any(Date) }),
      }),
    );
    expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "status_change" }),
    });
  });

  it("denies a user who is neither permitted nor the assignee/reporter", async () => {
    mockRequireUser.mockResolvedValue(stakeholderUser);
    mockPrisma.workItem.findUnique.mockResolvedValue({
      id: "w-1",
      status: "in_progress",
      assigneeId: "someone-else",
      reporterId: "another",
    });
    expect(await updateWorkItemStatus("w-1", "qa")).toEqual({
      error: "You do not have permission to update this item",
    });
  });
});

// ---------------------------------------------------------------------------
// assignWorkItem
// ---------------------------------------------------------------------------

describe("assignWorkItem", () => {
  it("returns error when item missing", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findUnique.mockResolvedValue(null);
    expect(await assignWorkItem("w-1", "user-2")).toEqual({ error: "Not found" });
  });

  it("assigns and notifies the new assignee", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findUnique.mockResolvedValue({
      id: "w-1",
      key: "CPM-1",
      assigneeId: null,
      reporterId: "user-admin",
    });
    const res = await assignWorkItem("w-1", "user-2");
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.workItem.update).toHaveBeenCalledWith({
      where: { id: "w-1" },
      data: { assigneeId: "user-2" },
    });
    expect(mockPrisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-2", type: "assignment" }),
    });
  });
});

// ---------------------------------------------------------------------------
// addComment
// ---------------------------------------------------------------------------

describe("addComment", () => {
  it("rejects an empty comment", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    expect(await addComment("w-1", "   ")).toEqual({ error: "Comment cannot be empty" });
  });

  it("rejects a comment over 5000 characters", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    expect(await addComment("w-1", "x".repeat(5001))).toEqual({
      error: "Comment is too long (max 5000 characters)",
    });
  });

  it("creates a comment and logs activity", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findUnique.mockResolvedValue({
      id: "w-1",
      key: "CPM-1",
      assigneeId: null,
    });
    const res = await addComment("w-1", "Looks good");
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.comment.create).toHaveBeenCalledWith({
      data: { workItemId: "w-1", authorId: "user-admin", body: "Looks good" },
    });
    expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "comment" }),
    });
  });
});

// ---------------------------------------------------------------------------
// createBlocker / resolveBlocker
// ---------------------------------------------------------------------------

describe("createBlocker", () => {
  it("rejects a reason over 1000 characters", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    expect(await createBlocker("w-1", "y".repeat(1001))).toEqual({
      error: "Reason is too long (max 1000 characters)",
    });
  });

  it("creates a blocker and flips the item to blocked", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findUnique.mockResolvedValue({ id: "w-1", key: "CPM-1" });
    const res = await createBlocker("w-1", "Waiting on API");
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.blocker.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workItemId: "w-1",
        reason: "Waiting on API",
        status: "open",
      }),
    });
    expect(mockPrisma.workItem.update).toHaveBeenCalledWith({
      where: { id: "w-1" },
      data: { status: "blocked" },
    });
  });
});

describe("resolveBlocker", () => {
  it("returns the item to in_progress when no open blockers remain", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.blocker.findUnique.mockResolvedValue({ id: "b-1", workItemId: "w-1" });
    mockPrisma.blocker.count.mockResolvedValue(0);
    const res = await resolveBlocker("b-1");
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.workItem.update).toHaveBeenCalledWith({
      where: { id: "w-1" },
      data: { status: "in_progress" },
    });
  });

  it("leaves status untouched while other blockers remain open", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.blocker.findUnique.mockResolvedValue({ id: "b-1", workItemId: "w-1" });
    mockPrisma.blocker.count.mockResolvedValue(2);
    await resolveBlocker("b-1");
    expect(mockPrisma.workItem.update).not.toHaveBeenCalled();
  });
});
