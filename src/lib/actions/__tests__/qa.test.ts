import { vi, describe, it, expect, beforeEach } from "vitest";
import { createTestCase, updateTestCase, recordTestRun } from "@/lib/actions/qa";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  project: { findUnique: vi.fn() },
  testCase: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  testRun: { create: vi.fn() },
  workItem: { create: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
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
const qaUser = { ...adminUser, id: "user-qa", role: "qa" as const };
const engineerUser = { ...adminUser, id: "user-eng", role: "engineer" as const };

function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Run the transaction callback against the same mock client.
  mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockPrisma) => Promise<unknown>) =>
    fn(mockPrisma),
  );
});

describe("createTestCase", () => {
  it("rejects users without qa.manage", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    const res = await createTestCase(
      {},
      fd({ title: "Login works", projectId: "p1", priority: "high" }),
    );
    expect(res).toEqual({ error: "You cannot manage test cases" });
  });

  it("rejects short titles (Zod min(3))", async () => {
    mockRequireUser.mockResolvedValue(qaUser);
    const res = await createTestCase({}, fd({ title: "AB", projectId: "p1", priority: "high" }));
    expect(res.error).toBe("Title must be at least 3 characters");
  });

  it("rejects when project does not exist", async () => {
    mockRequireUser.mockResolvedValue(qaUser);
    mockPrisma.project.findUnique.mockResolvedValue(null);
    const res = await createTestCase(
      {},
      fd({ title: "Login works", projectId: "missing", priority: "high" }),
    );
    expect(res).toEqual({ error: "Project not found" });
  });

  it("creates test case with delete-safe key {projectKey}-TC{max+1}", async () => {
    mockRequireUser.mockResolvedValue(qaUser);
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1", key: "PLAT" });
    mockPrisma.testCase.findMany.mockResolvedValue([{ key: "PLAT-TC2" }, { key: "PLAT-TC4" }]);
    mockPrisma.testCase.create.mockResolvedValue({ id: "tc-1" });
    const res = await createTestCase(
      {},
      fd({ title: "Login works", projectId: "p1", priority: "high" }),
    );
    expect(res).toEqual({ ok: true, id: "tc-1" });
    expect(mockPrisma.testCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: "PLAT-TC5",
        title: "Login works",
        status: "not_run",
        priority: "high",
        projectId: "p1",
        createdById: qaUser.id,
      }),
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/qa");
  });
});

describe("updateTestCase", () => {
  it("rejects users without qa.manage", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    const res = await updateTestCase(
      "tc-1",
      {},
      fd({ title: "Login works", projectId: "p1", priority: "high" }),
    );
    expect(res).toEqual({ error: "You cannot manage test cases" });
  });

  it("rejects unknown test case", async () => {
    mockRequireUser.mockResolvedValue(qaUser);
    mockPrisma.testCase.findUnique.mockResolvedValue(null);
    const res = await updateTestCase(
      "tc-1",
      {},
      fd({ title: "Login works", projectId: "p1", priority: "high" }),
    );
    expect(res).toEqual({ error: "Test case not found" });
  });

  it("updates and revalidates both /qa and detail page", async () => {
    mockRequireUser.mockResolvedValue(qaUser);
    mockPrisma.testCase.findUnique.mockResolvedValue({ id: "tc-1" });
    const res = await updateTestCase(
      "tc-1",
      {},
      fd({ title: "Login redirects", projectId: "p1", priority: "medium" }),
    );
    expect(res).toEqual({ ok: true, id: "tc-1" });
    expect(mockPrisma.testCase.update).toHaveBeenCalledWith({
      where: { id: "tc-1" },
      data: expect.objectContaining({ title: "Login redirects", priority: "medium" }),
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/qa");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/qa/test-cases/tc-1");
  });
});

describe("recordTestRun", () => {
  it("rejects users without qa.manage", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    expect(await recordTestRun("tc-1", "passed", "", false)).toEqual({
      error: "Not permitted",
    });
  });

  it("rejects unknown status (not in TEST_STATUSES)", async () => {
    mockRequireUser.mockResolvedValue(qaUser);
    expect(await recordTestRun("tc-1", "exploded", "", false)).toEqual({
      error: "Invalid status",
    });
  });

  it("rejects unknown test case", async () => {
    mockRequireUser.mockResolvedValue(qaUser);
    mockPrisma.testCase.findUnique.mockResolvedValue(null);
    expect(await recordTestRun("tc-1", "passed", "", false)).toEqual({
      error: "Test case not found",
    });
  });

  it("records a passing run without creating a bug", async () => {
    mockRequireUser.mockResolvedValue(qaUser);
    mockPrisma.testCase.findUnique.mockResolvedValue({
      id: "tc-1",
      key: "PLAT-TC1",
      title: "Login",
      projectId: "p1",
    });
    const res = await recordTestRun("tc-1", "passed", "all good", false);
    expect(res).toEqual({ ok: true, bugId: undefined });
    expect(mockPrisma.workItem.create).not.toHaveBeenCalled();
    expect(mockPrisma.testRun.create).toHaveBeenCalledWith({
      data: {
        testCaseId: "tc-1",
        status: "passed",
        notes: "all good",
        runById: qaUser.id,
        bugId: undefined,
      },
    });
    expect(mockPrisma.testCase.update).toHaveBeenCalledWith({
      where: { id: "tc-1" },
      data: { status: "passed" },
    });
  });

  it("creates a linked bug when status=failed AND createBug=true", async () => {
    mockRequireUser.mockResolvedValue(qaUser);
    mockPrisma.testCase.findUnique.mockResolvedValue({
      id: "tc-1",
      key: "PLAT-TC1",
      title: "Login",
      projectId: "p1",
    });
    mockPrisma.workItem.findMany.mockResolvedValue([{ key: "PLAT-9" }, { key: "PLAT-3" }]);
    mockPrisma.project.findUnique.mockResolvedValue({ id: "p1", key: "PLAT" });
    mockPrisma.workItem.create.mockResolvedValue({ id: "wi-bug-1" });
    const res = await recordTestRun("tc-1", "failed", "broken", true);
    expect(res).toEqual({ ok: true, bugId: "wi-bug-1" });
    expect(mockPrisma.workItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        key: "PLAT-10",
        type: "bug",
        priority: "high",
        status: "backlog",
        projectId: "p1",
        reporterId: qaUser.id,
      }),
    });
    expect(mockPrisma.testRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ bugId: "wi-bug-1", status: "failed" }),
    });
  });

  it("does NOT create a bug when status=failed AND createBug=false", async () => {
    mockRequireUser.mockResolvedValue(qaUser);
    mockPrisma.testCase.findUnique.mockResolvedValue({
      id: "tc-1",
      key: "PLAT-TC1",
      title: "Login",
      projectId: "p1",
    });
    const res = await recordTestRun("tc-1", "failed", "broken", false);
    expect(res).toEqual({ ok: true, bugId: undefined });
    expect(mockPrisma.workItem.create).not.toHaveBeenCalled();
  });
});
