import { vi, describe, it, expect, beforeEach } from "vitest";
import { createTeam, addTeamMember, removeTeamMember } from "@/lib/actions/teams";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  team: { findUnique: vi.fn(), create: vi.fn() },
  teamMember: { findUnique: vi.fn(), create: vi.fn(), deleteMany: vi.fn() },
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
const engineerUser = { ...adminUser, id: "user-eng", role: "engineer" as const };

beforeEach(() => vi.clearAllMocks());

describe("createTeam", () => {
  it("rejects users without team.manage", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    const fd = new FormData();
    fd.append("key", "PLAT");
    fd.append("name", "Platform");
    expect(await createTeam({}, fd)).toEqual({ error: "You cannot manage teams" });
  });

  it("rejects non-alphanumeric key", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const fd = new FormData();
    fd.append("key", "PL-AT");
    fd.append("name", "Platform");
    const res = await createTeam({}, fd);
    expect(res.error).toBe("Key must be alphanumeric");
  });

  it("rejects short key", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const fd = new FormData();
    fd.append("key", "X");
    fd.append("name", "Platform");
    const res = await createTeam({}, fd);
    expect(res.error).toBe("Key must be at least 2 characters");
  });

  it("rejects duplicate key (case-insensitive: stored upper)", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.team.findUnique.mockResolvedValue({ id: "t-existing" });
    const fd = new FormData();
    fd.append("key", "plat");
    fd.append("name", "Platform");
    const res = await createTeam({}, fd);
    expect(res).toEqual({ error: "A team with that key already exists" });
    expect(mockPrisma.team.findUnique).toHaveBeenCalledWith({ where: { key: "PLAT" } });
  });

  it("creates team with uppercased key", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.team.findUnique.mockResolvedValue(null);
    mockPrisma.team.create.mockResolvedValue({ id: "t-1" });
    const fd = new FormData();
    fd.append("key", "plat");
    fd.append("name", "Platform");
    fd.append("description", "Infra");
    const res = await createTeam({}, fd);
    expect(res).toEqual({ ok: true, id: "t-1" });
    expect(mockPrisma.team.create).toHaveBeenCalledWith({
      data: { key: "PLAT", name: "Platform", description: "Infra" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/teams");
  });
});

describe("addTeamMember", () => {
  it("rejects users without team.manage", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    expect(await addTeamMember("t-1", "u-1", null)).toEqual({
      error: "You cannot manage teams",
    });
  });

  it("rejects unknown team", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.team.findUnique.mockResolvedValue(null);
    expect(await addTeamMember("t-1", "u-1", null)).toEqual({ error: "Team not found" });
  });

  it("rejects duplicate membership", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.team.findUnique.mockResolvedValue({ id: "t-1" });
    mockPrisma.teamMember.findUnique.mockResolvedValue({ id: "tm-1" });
    expect(await addTeamMember("t-1", "u-1", null)).toEqual({
      error: "User is already a member",
    });
  });

  it("creates membership with roleName when provided", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.team.findUnique.mockResolvedValue({ id: "t-1" });
    mockPrisma.teamMember.findUnique.mockResolvedValue(null);
    const res = await addTeamMember("t-1", "u-1", "Lead");
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.teamMember.create).toHaveBeenCalledWith({
      data: { teamId: "t-1", userId: "u-1", roleName: "Lead" },
    });
  });

  it("normalises empty-string roleName to null", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.team.findUnique.mockResolvedValue({ id: "t-1" });
    mockPrisma.teamMember.findUnique.mockResolvedValue(null);
    await addTeamMember("t-1", "u-1", "");
    expect(mockPrisma.teamMember.create).toHaveBeenCalledWith({
      data: { teamId: "t-1", userId: "u-1", roleName: null },
    });
  });
});

describe("removeTeamMember", () => {
  it("rejects users without team.manage", async () => {
    mockRequireUser.mockResolvedValue(engineerUser);
    expect(await removeTeamMember("t-1", "u-1")).toEqual({
      error: "You cannot manage teams",
    });
  });

  it("deletes the membership and revalidates", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const res = await removeTeamMember("t-1", "u-1");
    expect(res).toEqual({ ok: true });
    expect(mockPrisma.teamMember.deleteMany).toHaveBeenCalledWith({
      where: { teamId: "t-1", userId: "u-1" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/teams/t-1");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/teams");
  });
});
