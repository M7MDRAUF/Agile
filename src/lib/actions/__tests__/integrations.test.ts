import { describe, it, expect, vi, beforeEach } from "vitest";
import { connectIntegration, disconnectIntegration } from "@/lib/actions/integrations";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  integration: { upsert: vi.fn() },
  auditLog: { create: vi.fn() },
}));
const mockRevalidate = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const admin = { id: "admin-1", role: "admin" as const, name: "A", email: "a@x.test" };
const eng = { id: "eng-1", role: "engineer" as const, name: "E", email: "e@x.test" };

beforeEach(() => vi.clearAllMocks());

describe("integrations RBAC", () => {
  it("blocks non-workspace-managers from connecting", async () => {
    mockRequireUser.mockResolvedValue(eng);
    const res = await connectIntegration("github");
    expect(res.error).toMatch(/cannot manage/);
    expect(mockPrisma.integration.upsert).not.toHaveBeenCalled();
  });

  it("blocks non-workspace-managers from disconnecting", async () => {
    mockRequireUser.mockResolvedValue(eng);
    const res = await disconnectIntegration("github");
    expect(res.error).toMatch(/cannot manage/);
    expect(mockPrisma.integration.upsert).not.toHaveBeenCalled();
  });

  it("rejects unknown integration keys", async () => {
    mockRequireUser.mockResolvedValue(admin);
    const res = await connectIntegration("not-a-real-integration");
    expect(res.error).toBe("Unknown integration");
  });

  it("admin can connect a real integration and audit log is written", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.integration.upsert.mockResolvedValue({});
    const res = await connectIntegration("github");
    expect(res.ok).toBe(true);
    expect(mockPrisma.integration.upsert).toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "integration_connect", entityId: "github" }),
      }),
    );
  });
});
