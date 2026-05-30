import { test, expect, login } from "./helpers";

// BUG-M31 — RBAC direct-URL matrix. Hitting a protected route directly (no
// navigation through the UI) must enforce the same permission checks. A user
// who lacks the permission for a route is redirected to /dashboard by
// requirePermission; a user who has it lands on the real page.

type Access = "allow" | "deny";

interface Case {
  /** Seed user email (role implied by the seed). */
  email: string;
  role: string;
  path: string;
  expect: Access;
}

// Representative routes and their required permissions (see requirePermission
// calls in src/app/(app)/**). Denials redirect to /dashboard.
const cases: Case[] = [
  // Stakeholder: only project/report/notification view + own profile.
  { email: "stakeholder@novacore.dev", role: "stakeholder", path: "/projects", expect: "allow" },
  { email: "stakeholder@novacore.dev", role: "stakeholder", path: "/reports", expect: "allow" },
  { email: "stakeholder@novacore.dev", role: "stakeholder", path: "/work-items", expect: "deny" },
  { email: "stakeholder@novacore.dev", role: "stakeholder", path: "/backlog", expect: "deny" },
  {
    email: "stakeholder@novacore.dev",
    role: "stakeholder",
    path: "/boards/kanban",
    expect: "deny",
  },
  { email: "stakeholder@novacore.dev", role: "stakeholder", path: "/qa", expect: "deny" },
  { email: "stakeholder@novacore.dev", role: "stakeholder", path: "/sprints", expect: "deny" },
  { email: "stakeholder@novacore.dev", role: "stakeholder", path: "/users", expect: "deny" },
  { email: "stakeholder@novacore.dev", role: "stakeholder", path: "/admin", expect: "deny" },
  {
    email: "stakeholder@novacore.dev",
    role: "stakeholder",
    path: "/work-items/new",
    expect: "deny",
  },

  // Engineer: broad view + create, but no admin/project-create/qa-manage.
  { email: "engineer@novacore.dev", role: "engineer", path: "/work-items", expect: "allow" },
  { email: "engineer@novacore.dev", role: "engineer", path: "/qa", expect: "allow" },
  { email: "engineer@novacore.dev", role: "engineer", path: "/work-items/new", expect: "allow" },
  { email: "engineer@novacore.dev", role: "engineer", path: "/admin", expect: "deny" },
  { email: "engineer@novacore.dev", role: "engineer", path: "/projects/new", expect: "deny" },
  { email: "engineer@novacore.dev", role: "engineer", path: "/qa/test-cases/new", expect: "deny" },

  // QA: can manage QA (create test cases) but still no admin/project-create.
  { email: "qa@novacore.dev", role: "qa", path: "/qa/test-cases/new", expect: "allow" },
  { email: "qa@novacore.dev", role: "qa", path: "/admin", expect: "deny" },
  { email: "qa@novacore.dev", role: "qa", path: "/projects/new", expect: "deny" },

  // Engineering manager: may create projects but is not an admin.
  { email: "em@novacore.dev", role: "engineering_manager", path: "/projects/new", expect: "allow" },
  { email: "em@novacore.dev", role: "engineering_manager", path: "/admin", expect: "deny" },

  // Admin: full access.
  { email: "admin@novacore.dev", role: "admin", path: "/admin", expect: "allow" },
  { email: "admin@novacore.dev", role: "admin", path: "/projects/new", expect: "allow" },
];

test.describe("RBAC direct-URL matrix", () => {
  for (const c of cases) {
    test(`${c.role} ${c.expect === "allow" ? "can" : "cannot"} open ${c.path}`, async ({
      page,
    }) => {
      await login(page, c.email);
      await page.goto(c.path);

      if (c.expect === "deny") {
        // requirePermission redirects unauthorized users to the dashboard.
        await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
      } else {
        await expect(page).toHaveURL(new RegExp(c.path.replace(/[/]/g, "\\/")), {
          timeout: 30_000,
        });
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      }
    });
  }
});
