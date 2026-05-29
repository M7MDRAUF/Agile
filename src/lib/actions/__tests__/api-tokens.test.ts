import { describe, it, expect, vi, beforeEach } from "vitest";
import { createApiToken, revokeApiToken } from "@/lib/actions/api-tokens";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  apiToken: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  auditLog: { create: vi.fn() },
}));
const mockRevalidate = vi.hoisted(() => vi.fn());
const mockHash = vi.hoisted(() => vi.fn(async (raw: string) => `hash(${raw})`));

vi.mock("next/cache", () => ({ revalidatePath: mockRevalidate }));
vi.mock("@/lib/auth/guards", () => ({ requireUser: mockRequireUser }));
vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth/password", () => ({ hashPassword: mockHash }));

const admin = { id: "admin-1", role: "admin" as const, name: "A", email: "a@x.test" };
const eng = { id: "eng-1", role: "engineer" as const, name: "E", email: "e@x.test" };

function fd(entries: Array<[string, string | string[]]>): FormData {
  const f = new FormData();
  for (const [k, v] of entries) {
    if (Array.isArray(v)) for (const item of v) f.append(k, item);
    else f.append(k, v);
  }
  return f;
}

beforeEach(() => vi.clearAllMocks());

describe("api-tokens.createApiToken", () => {
  it("blocks non-admins", async () => {
    mockRequireUser.mockResolvedValue(eng);
    const res = await createApiToken(
      {},
      fd([
        ["name", "ci"],
        ["expiresInDays", "30"],
        ["scopes", "read"],
      ]),
    );
    expect(res.error).toMatch(/cannot manage/);
    expect(mockPrisma.apiToken.create).not.toHaveBeenCalled();
  });

  it("rejects when no scope is selected", async () => {
    mockRequireUser.mockResolvedValue(admin);
    const res = await createApiToken(
      {},
      fd([
        ["name", "ci"],
        ["expiresInDays", "30"],
      ]),
    );
    expect(res.error).toMatch(/scope/i);
  });

  it("returns plaintext token ONCE and only stores the hash", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.apiToken.create.mockResolvedValue({});
    const res = await createApiToken(
      {},
      fd([
        ["name", "ci"],
        ["expiresInDays", "30"],
        ["scopes", ["read", "write"]],
      ]),
    );
    expect(res.ok).toBe(true);
    expect(res.token).toMatch(/^agf_[a-f0-9]{48}$/);
    const createCall = mockPrisma.apiToken.create.mock.calls[0][0];
    expect(createCall.data.tokenHash).toContain("hash(");
    expect(createCall.data.tokenHash).not.toBe(res.token);
    expect(createCall.data.scopes).toBe("read,write");
  });
});

describe("api-tokens.revokeApiToken", () => {
  it("rejects revoking a token owned by another user (IDOR guard)", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.apiToken.findUnique.mockResolvedValue({ id: "t", userId: "other" });
    const res = await revokeApiToken("t");
    expect(res.error).toBe("Token not found");
    expect(mockPrisma.apiToken.update).not.toHaveBeenCalled();
  });

  it("marks the token revoked when caller owns it", async () => {
    mockRequireUser.mockResolvedValue(admin);
    mockPrisma.apiToken.findUnique.mockResolvedValue({ id: "t", userId: admin.id });
    mockPrisma.apiToken.update.mockResolvedValue({});
    const res = await revokeApiToken("t");
    expect(res.ok).toBe(true);
    const updateCall = mockPrisma.apiToken.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ id: "t" });
    expect(updateCall.data.revokedAt).toBeInstanceOf(Date);
  });
});
