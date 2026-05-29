import { describe, it, expect } from "vitest";
import { can, permissionsFor, canEditWorkItem } from "@/lib/domain/permissions";

describe("can", () => {
  it("grants admins every permission", () => {
    expect(can("admin", "admin.access")).toBe(true);
    expect(can("admin", "user.manage")).toBe(true);
    expect(can("admin", "qa.manage")).toBe(true);
  });

  it("denies stakeholders write capabilities", () => {
    expect(can("stakeholder", "workitem.create")).toBe(false);
    expect(can("stakeholder", "board.move")).toBe(false);
    expect(can("stakeholder", "admin.access")).toBe(false);
  });

  it("lets stakeholders view reports and projects", () => {
    expect(can("stakeholder", "report.view")).toBe(true);
    expect(can("stakeholder", "project.view")).toBe(true);
  });

  it("gives scrum masters sprint management but not admin", () => {
    expect(can("scrum_master", "sprint.manage")).toBe(true);
    expect(can("scrum_master", "admin.access")).toBe(false);
  });

  it("gives QA the qa.manage capability", () => {
    expect(can("qa", "qa.manage")).toBe(true);
    expect(can("engineer", "qa.manage")).toBe(false);
  });
});

describe("permissionsFor", () => {
  it("returns a non-empty list for every role", () => {
    for (const role of ["admin", "engineer", "qa", "stakeholder"] as const) {
      expect(permissionsFor(role).length).toBeGreaterThan(0);
    }
  });
});

describe("canEditWorkItem", () => {
  const userId = "u1";

  it("allows roles with edit_any to edit anything", () => {
    expect(
      canEditWorkItem("engineering_manager", { assigneeId: "other", reporterId: "other", userId }),
    ).toBe(true);
  });

  it("allows contributors to edit only their assigned/reported items", () => {
    expect(canEditWorkItem("engineer", { assigneeId: userId, reporterId: null, userId })).toBe(
      true,
    );
    expect(canEditWorkItem("engineer", { assigneeId: null, reporterId: userId, userId })).toBe(
      true,
    );
    expect(canEditWorkItem("engineer", { assigneeId: "other", reporterId: "other", userId })).toBe(
      false,
    );
  });

  it("denies editing for roles without any edit capability", () => {
    expect(canEditWorkItem("stakeholder", { assigneeId: userId, reporterId: userId, userId })).toBe(
      false,
    );
  });
});
