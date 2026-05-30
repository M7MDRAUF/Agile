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

test.describe("Mobile navigation (375px)", () => {
  // BUG-H10 — the desktop sidebar is hidden below `md`; the hamburger drawer
  // must provide the same navigation on a 375px (iPhone SE) viewport.
  test("hamburger opens an accessible drawer and navigates", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 });
    await login(page, "admin@novacore.dev");
    await page.goto("/dashboard");

    // Open the drawer.
    const trigger = page.getByRole("button", { name: "Open navigation menu" });
    await expect(trigger).toBeVisible();
    await trigger.click();

    const dialog = page.getByRole("dialog", { name: "Navigation" });
    await expect(dialog).toBeVisible();

    // Navigate via a drawer link; the drawer closes and the route changes.
    await dialog.getByRole("link", { name: "Work Items" }).click();
    await expect(page).toHaveURL(/\/work-items/);
    await expect(dialog).toBeHidden();
  });

  test("Escape closes the drawer", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 });
    await login(page, "admin@novacore.dev");
    await page.goto("/dashboard");

    await page.getByRole("button", { name: "Open navigation menu" }).click();
    const dialog = page.getByRole("dialog", { name: "Navigation" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
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
