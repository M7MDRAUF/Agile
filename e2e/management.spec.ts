import { test, expect, login } from "./helpers";

test.describe("Sprint management", () => {
  test("an admin can create a sprint", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/sprints/new");

    const name = `E2E Sprint ${Date.now()}`;
    await page.getByLabel("Sprint name *").fill(name);
    // Project is required; select a known project from the seed data by label
    // so the selection is deterministic regardless of option ordering.
    const projectSelect = page.getByLabel("Project *");
    await projectSelect.selectOption({ label: "CPM · Customer Portal Modernization" });

    await page.getByRole("button", { name: "Create sprint" }).click();

    await page.waitForURL(/\/sprints\/.+/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  });
});

test.describe("Work item editing", () => {
  test("an admin can edit a work item title", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/work-items");
    // Open the first work item in the table using a scoped role-based selector.
    // Scoping to getByRole("table") avoids matching navigation links that also
    // start with "/work-items/", making the selector both stable and precise.
    await page.getByRole("table").getByRole("link").first().click();
    await page.waitForURL(/\/work-items\/.+/, { timeout: 30_000 });

    await page.getByRole("link", { name: "Edit" }).click();
    await page.waitForURL(/\/work-items\/.+\/edit/, { timeout: 30_000 });

    const suffix = ` (e2e ${Date.now()})`;
    const title = page.getByLabel("Title *");
    const current = (await title.inputValue()) ?? "";
    await title.fill(current + suffix);
    await page.getByRole("button", { name: "Save changes" }).click();

    await page.waitForURL(/\/work-items\/[^/]+$/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(suffix.trim());
  });
});

test.describe("Admin user management", () => {
  test("an admin can create a new user", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/admin");

    await page.getByRole("button", { name: /new user/i }).click();

    const email = `e2e-user-${Date.now()}@novacore.dev`;
    await page.getByLabel("Email *").fill(email);
    await page.getByLabel("Name *").fill("E2E Created User");
    await page.getByLabel("Temporary password *").fill("Password123!");
    await page.getByRole("button", { name: "Create user" }).click();

    await expect(page.getByText("User created.")).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("Team management", () => {
  test("an admin can create a team", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/teams");

    await page.getByRole("button", { name: /new team/i }).click();

    const stamp = Date.now();
    const key = `E2E${stamp.toString().slice(-5)}`;
    const name = `E2E Team ${stamp}`;
    await page.getByLabel("Key *").fill(key);
    await page.getByLabel("Name *").fill(name);
    await page.getByRole("button", { name: "Create team" }).click();

    await expect(page.getByText(name, { exact: false })).toBeVisible({ timeout: 30_000 });
  });
});
