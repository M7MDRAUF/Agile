import { test, expect, login } from "./helpers";

// The /projects/new form fields (from CreateProjectForm.tsx):
//   Label "Project Name *"  → input name="name"     (required, maxLength=100)
//   Label "Project Key *"   → input name="key"      (required, maxLength=6, css uppercase)
//   Button                  → "Create project"
//
// Known seed project used for assertions: "Customer Portal Modernization" (key: CPM).
// Roles with project.create: admin, engineering_manager.

test.describe("Projects page — role-based button visibility", () => {
  test("admin sees the New Project button", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/projects");

    await expect(page.getByRole("link", { name: /New Project/i })).toBeVisible();
  });

  test("engineer does not see the New Project button", async ({ page }) => {
    // engineers lack project.create permission
    await login(page, "engineer@novacore.dev");
    await page.goto("/projects");

    await expect(page.getByRole("link", { name: /New Project/i })).toHaveCount(0);
  });
});

test.describe("Project creation — navigation", () => {
  test("clicking New Project navigates to /projects/new", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/projects");

    await page.getByRole("link", { name: /New Project/i }).click();

    await expect(page).toHaveURL(/\/projects\/new/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("Project creation — happy path", () => {
  test("submitting valid data creates a project and redirects to its detail page", async ({
    page,
  }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/projects/new");

    const stamp = Date.now();
    // Project key: 2-6 uppercase letters/digits. Use last 5 digits of timestamp —
    // all digits match [A-Z0-9] and the length is always within [2, 6].
    const key = stamp.toString().slice(-5);
    const name = `E2E Project ${stamp}`;

    await page.getByLabel("Project Name *").fill(name);
    // The input applies CSS text-transform:uppercase visually but the DOM value
    // must already be uppercase so that server Zod regex passes on submission.
    await page.getByLabel("Project Key *").fill(key);
    await page.getByRole("button", { name: "Create project" }).click();

    // A successful creation redirects to /projects/<id>.
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});

test.describe("Project creation — validation errors", () => {
  test("submitting with an empty name shows a server-side validation error", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/projects/new");

    // Remove the HTML required attribute so the browser does not block the
    // submit and we can exercise the server-side Zod validation instead.
    await page.evaluate(() => {
      document.querySelector<HTMLInputElement>('input[name="name"]')?.removeAttribute("required");
    });

    await page.getByLabel("Project Key *").fill("TMPK");
    // Leave name empty — Zod min(1) returns "Name is required".
    await page.getByRole("button", { name: "Create project" }).click();

    await expect(page.getByRole("alert")).toBeVisible({ timeout: 30_000 });
  });

  test("submitting with an invalid key format shows a server-side validation error", async ({
    page,
  }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/projects/new");

    await page.getByLabel("Project Name *").fill("Test Project");
    // "abc" is lowercase — fails /^[A-Z0-9]+$/ regex on the server.
    // CSS text-transform:uppercase only affects visual display, not the submitted value.
    await page.getByLabel("Project Key *").fill("abc");
    await page.getByRole("button", { name: "Create project" }).click();

    // The form action returns { error: "Key must be uppercase letters and numbers only" }
    // which the form renders as role="alert".
    await expect(page.getByRole("alert")).toBeVisible({ timeout: 30_000 });
  });
});
