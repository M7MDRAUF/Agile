import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  createSprint,
  startSprint,
  completeSprint,
  setWorkItemSprint,
} from "@/lib/actions/sprints";

// Hoisted mocks — must exist before module resolution.
const mockRequireUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  project: { findUnique: vi.fn() },
  sprint: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  workItem: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  notification: { createMany: vi.fn() },
  activityLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const adminUser = {
  id: "user-admin",
  name: "Admin",
  email: "a@t.com",
  role: "admin" as const,
  avatarColor: null,
  title: null,
};
const engineerUser = { ...adminUser, id: "user-eng", role: "engineer" as const };

beforeEach(() => {
  vi.clearAllMocks();
  // default: run the transaction callback with the same mock client
  mockPrisma.$transaction.mockImplementation(
    (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma),
  );
});

describe("createSprint", () => {
  it("rejects users without sprint.manage", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    const fd = new FormData();
    fd.append("name", "Sprint Alpha");
    fd.append("projectId", "p1");
    const res = await createSprint({}, fd);
    expect(res).toEqual({ error: "You cannot manage sprints" });
  });

  it("rejects short names (Zod min(3))", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const fd = new FormData();
    fd.append("name", "AB");
    fd.append("projectId", "p1");
    const res = await createSprint({}, fd);
    expect(res.error).toBe("Name must be at least 3 characters");
  });

  it("rejects when project does not exist", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.project.findUnique.mockResolvedValue(null);
    const fd = new FormData();
    fd.append("name", "Sprint Alpha");
    fd.append("projectId", "missing");
    const res = await createSprint({}, fd);
    expect(res).toEqual({ error: "Project not found" });
  });

  it("creates a planned sprint and returns its id", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1" });
    mockPrisma.sprint.create.mockResolvedValue({ id: "s-1" });
    const fd = new FormData();
    fd.append("name", "Sprint Alpha");
    fd.append("projectId", "p1");
    fd.append("goal", "Ship v1");
    const res = await createSprint({}, fd);
    expect(res).toEqual({ ok: true, id: "s-1" });
    expect(mockPrisma.sprint.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "planned", goal: "Ship v1" }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/sprints");
  });
});

describe("startSprint", () => {
  it("rejects users without sprint.manage", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    expect(await startSprint("s-1")).toEqual({ error: "Not permitted" });
  });

  it("rejects unknown sprint", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.sprint.findUnique.mockResolvedValue(null);
    expect(await startSprint("s-1")).toEqual({ error: "Sprint not found" });
  });

  it("rejects already-completed sprint", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.sprint.findUnique.mockResolvedValue({ id: "s-1", status: "completed" });
    expect(await startSprint("s-1")).toEqual({ error: "Sprint is already completed" });
  });

  it("activates the sprint and notifies distinct assignees (excluding actor)", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.sprint.findUnique.mockResolvedValue({
      id: "s-1",
      status: "planned",
      name: "Alpha",
      startDate: null,
    });
    mockPrisma.workItem.findMany.mockResolvedValue([
      { assigneeId: "u-1" },
      { assigneeId: "u-2" },
      { assigneeId: adminUser.id }, // self should be filtered out
    ]);
    const res = await startSprint("s-1");
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.sprint.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "active" }) }),
    );
    expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ userId: "u-1", type: "sprint" }),
        expect.objectContaining({ userId: "u-2", type: "sprint" }),
      ],
    });
  });

  it("skips notification.createMany when no other assignees", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.sprint.findUnique.mockResolvedValue({
      id: "s-1",
      status: "planned",
      name: "Alpha",
      startDate: null,
    });
    mockPrisma.workItem.findMany.mockResolvedValue([]);
    await startSprint("s-1");
    expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
  });
});

describe("completeSprint", () => {
  it("rejects users without sprint.manage", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    expect(await completeSprint("s-1")).toEqual({ error: "Not permitted" });
  });

  it("rejects already-completed sprint", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.sprint.findUnique.mockResolvedValue({
      id: "s-1",
      status: "completed",
      workItems: [],
    });
    expect(await completeSprint("s-1")).toEqual({ error: "Sprint is already completed" });
  });

  it("rolls incomplete items off the sprint via a single updateMany", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.sprint.findUnique.mockResolvedValue({
      id: "s-1",
      status: "active",
      endDate: null,
      workItems: [
        { id: "w-1", status: "done" },
        { id: "w-2", status: "in_progress" },
        { id: "w-3", status: "ready" },
      ],
    });
    const res = await completeSprint("s-1");
    expect(res).toEqual({ ok: true, rolledOver: 2 });
    expect(mockPrisma.workItem.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["w-2", "w-3"] } },
      data: { sprintId: null },
    });
  });

  it("does not call updateMany when all items are done", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.sprint.findUnique.mockResolvedValue({
      id: "s-1",
      status: "active",
      endDate: null,
      workItems: [{ id: "w-1", status: "done" }],
    });
    const res = await completeSprint("s-1");
    expect(res).toEqual({ ok: true, rolledOver: 0 });
    expect(mockPrisma.workItem.updateMany).not.toHaveBeenCalled();
  });
});

describe("setWorkItemSprint", () => {
  it("rejects users without sprint.manage AND without workitem.edit_any", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    expect(await setWorkItemSprint("w-1", "s-1")).toEqual({ error: "Not permitted" });
  });

  it("rejects unknown work item", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findUnique.mockResolvedValue(null);
    expect(await setWorkItemSprint("w-1", "s-1")).toEqual({ error: "Work item not found" });
  });

  it("moves item to a sprint and logs activity", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findUnique.mockResolvedValue({ id: "w-1" });
    const res = await setWorkItemSprint("w-1", "s-1");
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.workItem.update).toHaveBeenCalledWith({
      where: { id: "w-1" },
      data: { sprintId: "s-1" },
    });
    expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "sprint_change",
        message: "added to a sprint",
      }),
    });
  });

  it("moves item to backlog (sprintId=null) and logs activity", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.workItem.findUnique.mockResolvedValue({ id: "w-1" });
    await setWorkItemSprint("w-1", null);
    expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ message: "moved to the backlog" }),
    });
  });
});
