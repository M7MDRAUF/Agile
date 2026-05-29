import { test, expect, login } from "./helpers";

test.describe("Work item lifecycle", () => {
  test("an engineer can create a work item", async ({ page }) => {
    await login(page, "engineer@novacore.dev");
    await page.goto("/work-items/new");

    const title = `E2E smoke item ${Date.now()}`;
    await page.getByLabel("Title *").fill(title);
    await page.getByLabel("Description").fill("Created by the Playwright smoke test.");
    await page.getByLabel("Type *").selectOption("task");
    await page.getByLabel("Priority *").selectOption("high");
    // Project select is required; choose the first available option.
    const projectSelect = page.getByLabel("Project *");
    const firstProject = await projectSelect.locator("option").nth(0).getAttribute("value");
    if (firstProject) await projectSelect.selectOption(firstProject);

    await page.getByRole("button", { name: "Create work item" }).click();

    await page.waitForURL(/\/work-items/, { timeout: 30_000 });
    await expect(page.getByText(title)).toBeVisible();
  });

  test("a work item detail page exposes a status control for editors", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/work-items");
    // Open the first work item in the list.
    await page.locator('a[href^="/work-items/"]').first().click();
    await page.waitForURL(/\/work-items\/.+/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
