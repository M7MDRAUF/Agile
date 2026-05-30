import { test, expect, login } from "./helpers";

// BUG-H14 — board status changes must persist to the database.
//
// The Kanban board exposes a per-card StatusSelect (aria-label
// "Update status for <title>") that calls the updateWorkItemStatus server
// action. This test creates a fresh work item (which starts in "backlog"),
// moves it to a valid next status on the board, reloads the page, and asserts
// the new status survived a round-trip — proving the change was persisted and
// not merely an optimistic client-side update.

test.describe("Kanban board persistence", () => {
  test("a status change on the board survives a reload", async ({ page }) => {
    await login(page, "admin@novacore.dev");

    // Create a deterministic work item so we can target its card precisely.
    await page.goto("/work-items/new");
    const title = `E2E board persistence ${Date.now()}`;
    await page.getByLabel("Title *").fill(title);
    await page.getByLabel("Type *").selectOption("task");
    await page.getByLabel("Priority *").selectOption("medium");
    const projectSelect = page.getByLabel("Project *");
    const firstProject = await projectSelect.locator("option").nth(0).getAttribute("value");
    if (firstProject) await projectSelect.selectOption(firstProject);
    await page.getByRole("button", { name: "Create work item" }).click();
    await page.waitForURL(/\/work-items/, { timeout: 30_000 });

    // Move it on the board: backlog -> ready is an allowed transition. Scope the
    // board to the same project the item was created in (the board defaults to
    // the alphabetically-first project, which may differ).
    await page.goto(`/boards/kanban?project=${firstProject}`);
    const statusSelect = page.getByLabel(`Update status for ${title}`);
    await expect(statusSelect).toBeVisible({ timeout: 30_000 });
    await expect(statusSelect).toHaveValue("backlog");
    await statusSelect.selectOption("ready");

    // The server action + revalidation re-renders the board; give it a beat,
    // then hard-reload to prove the new status came from the database.
    await expect
      .poll(async () => page.getByLabel(`Update status for ${title}`).inputValue(), {
        timeout: 30_000,
      })
      .toBe("ready");

    await page.reload();
    const afterReload = page.getByLabel(`Update status for ${title}`);
    await expect(afterReload).toBeVisible({ timeout: 30_000 });
    await expect(afterReload).toHaveValue("ready");
  });
});
