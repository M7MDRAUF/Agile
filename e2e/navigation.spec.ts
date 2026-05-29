import { test, expect, login } from "./helpers";

test.describe("Navigation across core routes (admin)", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, "admin@novacore.dev");
  });

  const routes: string[] = [
    "/dashboard",
    "/my-work",
    "/projects",
    "/work-items",
    "/backlog",
    "/sprints",
    "/boards/scrum",
    "/boards/kanban",
    "/qa",
    "/reports",
    "/teams",
    "/users",
    "/notifications",
    "/settings",
    "/admin",
    "/search?q=api",
  ];

  for (const path of routes) {
    test(`renders ${path}`, async ({ page }) => {
      await page.goto(path);
      const heading = page.getByRole("heading", { level: 1 }).first();
      await expect(heading).toBeVisible();
      // The page must render real content, not the Next.js error boundary.
      await expect(heading).not.toHaveText(/couldn.?t load|something went wrong/i);
      // Sidebar (only present inside the authenticated app shell) confirms we
      // are on a real page rather than a redirect to login.
      await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
    });
  }
});

test.describe("Role-based access control", () => {
  test("stakeholder cannot access the admin console", async ({ page }) => {
    await login(page, "stakeholder@novacore.dev");
    await page.goto("/admin");
    // requirePermission redirects unauthorized users to the dashboard.
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test("stakeholder cannot create work items", async ({ page }) => {
    await login(page, "stakeholder@novacore.dev");
    await page.goto("/work-items/new");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
