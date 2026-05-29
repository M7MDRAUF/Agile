import { describe, it, expect, vi, beforeEach } from "vitest";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/actions/notifications";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  notification: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
}));
const mockRevalidate = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));

const userA = { id: "u-a", role: "engineer" as const, name: "A", email: "a@x.test" };
const userB = { id: "u-b", role: "engineer" as const, name: "B", email: "b@x.test" };

beforeEach(() => vi.clearAllMocks());

describe("notifications.markNotificationRead", () => {
  it("rejects when target notification is owned by another user (IDOR guard)", async () => {
    mockRequireUser.mockResolvedValue(userA);
    mockPrisma.notification.findUnique.mockResolvedValue({ id: "n", userId: userB.id });
    const res = await markNotificationRead("n");
    expect(res.error).toBe("Not found");
    expect(mockPrisma.notification.update).not.toHaveBeenCalled();
  });

  it("returns Not found for missing rows", async () => {
    mockRequireUser.mockResolvedValue(userA);
    mockPrisma.notification.findUnique.mockResolvedValue(null);
    const res = await markNotificationRead("missing");
    expect(res.error).toBe("Not found");
  });

  it("marks read when owned by caller and revalidates", async () => {
    mockRequireUser.mockResolvedValue(userA);
    mockPrisma.notification.findUnique.mockResolvedValue({ id: "n", userId: userA.id });
    mockPrisma.notification.update.mockResolvedValue({});
    const res = await markNotificationRead("n");
    expect(res.ok).toBe(true);
    expect(mockPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: "n" },
      data: { read: true },
    });
    expect(mockRevalidate).toHaveBeenCalledWith("/notifications");
  });
});

describe("notifications.markAllNotificationsRead", () => {
  it("scopes updateMany to current user only", async () => {
    mockRequireUser.mockResolvedValue(userA);
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });
    const res = await markAllNotificationsRead();
    expect(res.ok).toBe(true);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: userA.id, read: false },
      data: { read: true },
    });
  });
});
