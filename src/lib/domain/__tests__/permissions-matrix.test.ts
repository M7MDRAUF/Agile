import { describe, it, expect } from "vitest";
import { can, permissionsFor, canEditWorkItem, PERMISSIONS } from "@/lib/domain/permissions";
import type { Role } from "@/lib/domain/constants";

// QA-005: RBAC action-layer assertions.
//
// Server-action tests already cover the *behavioural* RBAC checks
// ("engineer cannot deactivate workspace", "qa can create test cases").
// This file pins down the *matrix* — every role × every permission —
// so a future "engineer suddenly gets workspace.manage" silent
// privilege escalation will fail a test instead of slipping through.
//
// If any cell in EXPECTED_MATRIX changes, this test fails; reviewers
// must update the matrix deliberately rather than discover the drift
// in production.

const ROLES: Role[] = [
  "admin",
  "engineering_manager",
  "product_owner",
  "scrum_master",
  "engineer",
  "qa",
  "designer",
  "stakeholder",
];

// Locked-in expected grants. `true` = role has permission.
// Source of truth: src/lib/domain/permissions.ts as of commit `406dc51`.
type Matrix = Record<Role, ReadonlyArray<(typeof PERMISSIONS)[number]>>;

const EXPECTED_GRANTS: Matrix = {
  admin: PERMISSIONS, // admin has ALL
  engineering_manager: [
    "project.view",
    "workitem.view",
    "sprint.view",
    "team.view",
    "user.view",
    "qa.view",
    "report.view",
    "notification.view",
    "settings.manage_profile",
    "team.manage",
    "project.create",
    "project.edit",
    "project.archive",
    "workitem.create",
    "workitem.edit_any",
    "sprint.manage",
    "board.move",
    "blocker.create",
    "blocker.resolve",
    "comment.create",
  ],
  product_owner: [
    "project.view",
    "workitem.view",
    "sprint.view",
    "team.view",
    "user.view",
    "qa.view",
    "report.view",
    "notification.view",
    "settings.manage_profile",
    "project.edit",
    "project.archive",
    "workitem.create",
    "workitem.edit_any",
    "backlog.prioritize",
    "comment.create",
    "blocker.create",
    "board.move",
  ],
  scrum_master: [
    "project.view",
    "workitem.view",
    "sprint.view",
    "team.view",
    "user.view",
    "qa.view",
    "report.view",
    "notification.view",
    "settings.manage_profile",
    "sprint.manage",
    "board.move",
    "workitem.create",
    "workitem.edit_any",
    "blocker.create",
    "blocker.resolve",
    "comment.create",
  ],
  engineer: [
    "project.view",
    "workitem.view",
    "sprint.view",
    "team.view",
    "user.view",
    "qa.view",
    "report.view",
    "notification.view",
    "settings.manage_profile",
    "workitem.create",
    "workitem.edit_assigned",
    "board.move",
    "blocker.create",
    "comment.create",
  ],
  qa: [
    "project.view",
    "workitem.view",
    "sprint.view",
    "team.view",
    "user.view",
    "qa.view",
    "report.view",
    "notification.view",
    "settings.manage_profile",
    "qa.manage",
    "workitem.create",
    "workitem.edit_assigned",
    "blocker.create",
    "comment.create",
    "board.move",
  ],
  designer: [
    "project.view",
    "workitem.view",
    "sprint.view",
    "team.view",
    "user.view",
    "qa.view",
    "report.view",
    "notification.view",
    "settings.manage_profile",
    "workitem.edit_assigned",
    "comment.create",
    "board.move",
  ],
  stakeholder: ["project.view", "report.view", "notification.view", "settings.manage_profile"],
};

describe("permissions.can — role × permission matrix (QA-005)", () => {
  for (const role of ROLES) {
    const expected = new Set(EXPECTED_GRANTS[role]);
    describe(`role: ${role}`, () => {
      for (const perm of PERMISSIONS) {
        const shouldGrant = expected.has(perm);
        it(`${shouldGrant ? "grants" : "denies"} ${perm}`, () => {
          expect(can(role, perm)).toBe(shouldGrant);
        });
      }
    });
  }
});

describe("permissions.can — dangerous-action lock-ins", () => {
  // These are the high-blast-radius gates. If anyone widens them
  // without updating EXPECTED_GRANTS, this block also catches it —
  // but the named tests make the intent explicit in CI output.
  it.each([
    "engineering_manager",
    "product_owner",
    "scrum_master",
    "engineer",
    "qa",
    "designer",
    "stakeholder",
  ] as Role[])("denies admin.access to non-admin role `%s`", (role) => {
    expect(can(role, "admin.access")).toBe(false);
  });

  it.each([
    "engineering_manager",
    "product_owner",
    "scrum_master",
    "engineer",
    "qa",
    "designer",
    "stakeholder",
  ] as Role[])("denies settings.manage_workspace to non-admin role `%s`", (role) => {
    expect(can(role, "settings.manage_workspace")).toBe(false);
  });

  it.each([
    "engineering_manager",
    "product_owner",
    "scrum_master",
    "engineer",
    "qa",
    "designer",
    "stakeholder",
  ] as Role[])("denies user.manage (create/disable users) to non-admin role `%s`", (role) => {
    expect(can(role, "user.manage")).toBe(false);
  });

  it.each([
    "engineering_manager",
    "product_owner",
    "scrum_master",
    "engineer",
    "qa",
    "designer",
    "stakeholder",
  ] as Role[])("denies audit.view to non-admin role `%s`", (role) => {
    expect(can(role, "audit.view")).toBe(false);
  });

  it("only admin has every permission", () => {
    for (const role of ROLES) {
      const got = permissionsFor(role);
      const hasAll = PERMISSIONS.every((p) => got.includes(p));
      expect(hasAll, `${role} unexpectedly has every permission`).toBe(role === "admin");
    }
  });

  it("stakeholder is read-only (no create/edit/manage/move)", () => {
    const stakeholderPerms = permissionsFor("stakeholder");
    const forbidden = stakeholderPerms.filter((p) =>
      /\.(create|edit|edit_any|edit_assigned|manage|manage_workspace|move|prioritize)$/.test(p),
    );
    expect(forbidden).toEqual([]);
  });
});

describe("canEditWorkItem — assignment-scoped edit rules", () => {
  const ALICE = "user-alice";
  const BOB = "user-bob";

  it("admin can always edit (workitem.edit_any)", () => {
    expect(canEditWorkItem("admin", { userId: ALICE })).toBe(true);
    expect(canEditWorkItem("admin", { userId: ALICE, assigneeId: BOB })).toBe(true);
  });

  it("engineering_manager / product_owner / scrum_master can edit any (edit_any)", () => {
    for (const role of ["engineering_manager", "product_owner", "scrum_master"] as Role[]) {
      expect(canEditWorkItem(role, { userId: ALICE, assigneeId: BOB })).toBe(true);
    }
  });

  it("engineer can edit only when they are assignee OR reporter", () => {
    expect(canEditWorkItem("engineer", { userId: ALICE, assigneeId: ALICE })).toBe(true);
    expect(canEditWorkItem("engineer", { userId: ALICE, reporterId: ALICE })).toBe(true);
    expect(canEditWorkItem("engineer", { userId: ALICE, assigneeId: BOB, reporterId: BOB })).toBe(
      false,
    );
    expect(canEditWorkItem("engineer", { userId: ALICE })).toBe(false);
  });

  it("designer can edit only when they are assignee OR reporter", () => {
    expect(canEditWorkItem("designer", { userId: ALICE, assigneeId: ALICE })).toBe(true);
    expect(canEditWorkItem("designer", { userId: ALICE, assigneeId: BOB })).toBe(false);
  });

  it("stakeholder cannot edit any work item", () => {
    expect(canEditWorkItem("stakeholder", { userId: ALICE, assigneeId: ALICE })).toBe(false);
    expect(canEditWorkItem("stakeholder", { userId: ALICE, reporterId: ALICE })).toBe(false);
  });
});
