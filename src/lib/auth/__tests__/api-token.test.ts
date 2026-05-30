import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPrisma = vi.hoisted(() => ({
  apiToken: { findFirst: vi.fn(), update: vi.fn() },
}));
const mockVerify = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ prisma: mockPrisma }));
vi.mock("@/lib/auth/password", () => ({ verifyPassword: mockVerify }));

import { authenticateApiToken, tokenHasScope } from "@/lib/auth/api-token";

const RAW = `agf_${"a".repeat(48)}`; // valid-looking token, prefix = first 12 chars

function req(auth?: string) {
  return new Request("http://localhost/api/export/workspace", {
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => vi.clearAllMocks());

describe("authenticateApiToken", () => {
  it("returns null without a Bearer header", async () => {
    expect(await authenticateApiToken(req())).toBeNull();
    expect(await authenticateApiToken(req("Basic xyz"))).toBeNull();
  });

  it("returns null for tokens with the wrong prefix scheme", async () => {
    expect(await authenticateApiToken(req("Bearer not-an-agf-token"))).toBeNull();
    expect(mockPrisma.apiToken.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when no matching active token exists", async () => {
    mockPrisma.apiToken.findFirst.mockResolvedValue(null);
    expect(await authenticateApiToken(req(`Bearer ${RAW}`))).toBeNull();
  });

  it("rejects expired tokens", async () => {
    mockPrisma.apiToken.findFirst.mockResolvedValue({
      id: "t1",
      userId: "u1",
      tokenHash: "h",
      scopes: "read",
      expiresAt: new Date(Date.now() - 1000),
      user: { status: "active", role: "admin" },
    });
    expect(await authenticateApiToken(req(`Bearer ${RAW}`))).toBeNull();
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("rejects tokens whose hash does not match", async () => {
    mockPrisma.apiToken.findFirst.mockResolvedValue({
      id: "t1",
      userId: "u1",
      tokenHash: "h",
      scopes: "read,write",
      expiresAt: null,
      user: { status: "active", role: "admin" },
    });
    mockVerify.mockResolvedValue(false);
    expect(await authenticateApiToken(req(`Bearer ${RAW}`))).toBeNull();
  });

  it("authenticates a valid token, stamps lastUsedAt, and parses scopes", async () => {
    mockPrisma.apiToken.findFirst.mockResolvedValue({
      id: "t1",
      userId: "u1",
      tokenHash: "h",
      scopes: "read, write",
      expiresAt: null,
      user: { status: "active", role: "admin" },
    });
    mockVerify.mockResolvedValue(true);
    mockPrisma.apiToken.update.mockResolvedValue({});
    const token = await authenticateApiToken(req(`Bearer ${RAW}`));
    expect(token).toEqual({
      tokenId: "t1",
      userId: "u1",
      role: "admin",
      scopes: ["read", "write"],
    });
    expect(mockPrisma.apiToken.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it("rejects tokens belonging to inactive users", async () => {
    mockPrisma.apiToken.findFirst.mockResolvedValue({
      id: "t1",
      userId: "u1",
      tokenHash: "h",
      scopes: "read",
      expiresAt: null,
      user: { status: "inactive", role: "admin" },
    });
    expect(await authenticateApiToken(req(`Bearer ${RAW}`))).toBeNull();
  });
});

describe("tokenHasScope", () => {
  const base = { tokenId: "t", userId: "u", role: "admin" as const };
  it("matches explicit scopes", () => {
    expect(tokenHasScope({ ...base, scopes: ["read"] }, "read")).toBe(true);
    expect(tokenHasScope({ ...base, scopes: ["read"] }, "write")).toBe(false);
  });
  it("treats admin scope as a superset", () => {
    expect(tokenHasScope({ ...base, scopes: ["admin"] }, "write")).toBe(true);
    expect(tokenHasScope({ ...base, scopes: ["admin"] }, "read")).toBe(true);
  });
});
