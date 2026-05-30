import { test, expect, login } from "./helpers";

// BUG-M30 — end-to-end coverage for the workflows whose UIs were added during
// remediation: backlog → sprint scheduling, project editing, QA bug creation
// from a failed run, notifications mark-all-read, and logout.

test.describe("Sprint scheduling from the backlog", () => {
  test("an admin can pull a backlog item into a sprint", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/sprints");

    // Open the first real sprint in the list (exclude the "New sprint" link).
    await page.locator('a[href^="/sprints/"]:not([href$="/new"])').first().click();
    await page.waitForURL(/\/sprints\/[^/]+$/, { timeout: 30_000 });

    // Reveal the candidate list.
    await page.getByRole("button", { name: "Add items" }).click();

    const addButtons = page.getByRole("button", { name: /Add .+ to sprint/ });
    const count = await addButtons.count();
    test.skip(count === 0, "No unscheduled backlog items available in this sprint's project.");

    const firstAdd = addButtons.first();
    const label = await firstAdd.getAttribute("aria-label");
    await firstAdd.click();

    // On success the candidate is removed from the list (router.refresh
    // re-renders), proving the assignment persisted server-side. On failure the
    // component keeps the button and shows an inline error, so the button
    // disappearing is a reliable success signal.
    if (label) {
      await expect(page.getByRole("button", { name: label })).toHaveCount(0, { timeout: 30_000 });
    }
  });
});

test.describe("Project editing", () => {
  test("an admin can rename a project and the change persists", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/projects");

    await page.locator('a[href^="/projects/"]:not([href$="/new"])').first().click();
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 30_000 });
    const url = page.url();

    await page.getByRole("button", { name: "Edit project" }).click();
    const nameField = page.getByLabel("Project Name *");
    const original = (await nameField.inputValue()) ?? "";
    const suffix = ` (edited e2e ${Date.now()})`;
    await nameField.fill(original + suffix);
    await page.getByRole("button", { name: "Save changes" }).click();

    // Reload to confirm the new name was written to the database.
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(suffix.trim(), {
      timeout: 30_000,
    });
  });
});

test.describe("QA — logging a bug from a failed run", () => {
  test("a failed run with the linked-bug option creates a bug", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/qa");

    // Open the first real test case (exclude the "New test case" link).
    await page.locator('a[href^="/qa/test-cases/"]:not([href$="/new"])').first().click();
    await page.waitForURL(/\/qa\/test-cases\/[^/]+$/, { timeout: 30_000 });

    await page.getByLabel("Result", { exact: true }).selectOption("failed");
    // The "Create a linked bug for this failure" checkbox defaults to checked.
    await expect(page.getByRole("checkbox")).toBeChecked();
    await page.getByLabel("Notes").fill(`E2E failure ${Date.now()}`);
    await page.getByRole("button", { name: "Record run" }).click();

    // The new run appears in the history with a linked "Bug" badge.
    await expect(page.getByText("Bug", { exact: true }).first()).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("Notifications", () => {
  test("mark all read clears the unread actions", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/notifications");

    const markAll = page.getByRole("button", { name: /Mark all read/i });
    test.skip((await markAll.count()) === 0, "No unread notifications to clear.");

    await markAll.click();
    // After marking everything read the bulk action is removed.
    await expect(page.getByRole("button", { name: /Mark all read/i })).toHaveCount(0, {
      timeout: 30_000,
    });
  });
});

test.describe("Logout", () => {
  test("signing out returns the user to the login page", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/dashboard");

    await page.getByRole("button", { name: /Account menu for/i }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();

    await page.waitForURL(/\/login/, { timeout: 30_000 });
    // Protected routes must now redirect back to login.
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
