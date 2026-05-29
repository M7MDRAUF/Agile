import { vi, describe, it, expect, beforeEach } from "vitest";
import { createProject, updateProject, archiveProject } from "@/lib/actions/projects";

// ---------------------------------------------------------------------------
// Hoisted mocks — created before any module is resolved so they can be
// referenced inside the vi.mock factory functions below.
// ---------------------------------------------------------------------------

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  project: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
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

const engineerUser = {
  id: "user-eng",
  name: "Engineer User",
  email: "eng@test.com",
  role: "engineer" as const,
  avatarColor: null,
  title: null,
};

const engineeringManagerUser = {
  id: "user-em",
  name: "EM User",
  email: "em@test.com",
  role: "engineering_manager" as const,
  avatarColor: null,
  title: null,
};

// ---------------------------------------------------------------------------
// createProject
// ---------------------------------------------------------------------------

describe("createProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { error } when user lacks project.create permission", async () => {
    // engineer does not have project.create
    mockRequireUser.mockResolvedValue(engineerUser);
    const fd = new FormData();
    fd.append("name", "Test Project");
    fd.append("key", "TEST");

    const result = await createProject({}, fd);

    expect(result).toEqual({ error: "You cannot create projects" });
  });

  it("returns { error } when name is missing (empty string)", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    const fd = new FormData();
    fd.append("name", ""); // empty → Zod min(1) fails with "Name is required"
    fd.append("key", "NEWP");

    const result = await createProject({}, fd);

    expect(result.error).toBe("Name is required");
  });

  it("returns { error } when project key already exists", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.project.findUnique.mockResolvedValue({ id: "existing-id", key: "DUPE" });
    const fd = new FormData();
    fd.append("name", "Duplicate Project");
    fd.append("key", "DUPE");

    const result = await createProject({}, fd);

    expect(result).toEqual({ error: 'Key "DUPE" is already in use by another project' });
  });

  it("returns { ok: true, projectId } when valid data provided by admin", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.project.findUnique.mockResolvedValue(null);
    mockPrisma.project.create.mockResolvedValue({ id: "new-proj-id" });
    mockPrisma.auditLog.create.mockResolvedValue({});
    const fd = new FormData();
    fd.append("name", "New Project");
    fd.append("key", "NEWP");

    const result = await createProject({}, fd);

    expect(result).toEqual({ ok: true, projectId: "new-proj-id" });
    expect(mockPrisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "New Project",
          key: "NEWP",
          ownerId: "user-admin",
        }),
      }),
    );
  });

  it("returns { ok: true, projectId } when valid data provided by engineering_manager", async () => {
    mockRequireUser.mockResolvedValue(engineeringManagerUser);
    mockPrisma.project.findUnique.mockResolvedValue(null);
    mockPrisma.project.create.mockResolvedValue({ id: "em-proj-id" });
    mockPrisma.auditLog.create.mockResolvedValue({});
    const fd = new FormData();
    fd.append("name", "EM Project");
    fd.append("key", "EMP");

    const result = await createProject({}, fd);

    expect(result).toEqual({ ok: true, projectId: "em-proj-id" });
  });
});

// ---------------------------------------------------------------------------
// updateProject
// ---------------------------------------------------------------------------

describe("updateProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { error } when user lacks project.edit permission", async () => {
    // engineer does not have project.edit
    mockRequireUser.mockResolvedValue(engineerUser);
    const fd = new FormData();
    fd.append("name", "Updated Name");

    const result = await updateProject("proj-1", {}, fd);

    expect(result).toEqual({ error: "You cannot edit projects" });
  });

  it("returns { ok: true } when valid data provided by authorized user", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.project.findUnique.mockResolvedValue({ id: "proj-1", name: "Old Name" });
    mockPrisma.project.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});
    const fd = new FormData();
    fd.append("name", "Updated Name");

    const result = await updateProject("proj-1", {}, fd);

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "proj-1" },
        data: expect.objectContaining({ name: "Updated Name" }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// archiveProject
// ---------------------------------------------------------------------------

describe("archiveProject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { error } when user lacks project.edit permission", async () => {
    // engineer does not have project.edit
    mockRequireUser.mockResolvedValue(engineerUser);

    const result = await archiveProject("proj-1");

    expect(result).toEqual({ error: "You cannot archive projects" });
  });

  it("returns { ok: true } when authorized user archives an active project", async () => {
    mockRequireUser.mockResolvedValue(adminUser);
    mockPrisma.project.findUnique.mockResolvedValue({ id: "proj-1", status: "active" });
    mockPrisma.project.update.mockResolvedValue({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await archiveProject("proj-1");

    expect(result).toEqual({ ok: true });
    expect(mockPrisma.project.update).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: { status: "archived" },
    });
  });
});
