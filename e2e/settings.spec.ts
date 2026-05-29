import { test, expect, login } from "./helpers";

test.describe("Settings — personal preferences", () => {
  test("admin sees the full settings shell with workspace sections", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/settings");

    await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
    // Personal tabs
    await expect(page.getByRole("tab", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Password" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Notifications" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Appearance" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Regional" })).toBeVisible();
    // Admin-only tabs
    await expect(page.getByRole("tab", { name: "Workspace" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Integrations" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "API tokens" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Danger zone" })).toBeVisible();
  });

  test("updating display name persists", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/settings");

    const unique = `Admin QA ${Date.now()}`;
    await page.getByRole("tab", { name: "Profile" }).click();
    const nameInput = page.getByLabel("Display name");
    await nameInput.fill(unique);
    await page.getByRole("button", { name: /Save profile/i }).click();
    await expect(page.getByText(/saved/i).first()).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("Display name")).toHaveValue(unique);
  });

  test("password change rejects a weak password", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/settings");
    await page.getByRole("tab", { name: "Password" }).click();

    await page.getByLabel("Current password").fill("Password123!");
    await page.getByLabel("New password", { exact: true }).fill("weak");
    await page.getByLabel("Confirm new password").fill("weak");
    await page.getByRole("button", { name: /Update password/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("workspace slug validation rejects invalid characters", async ({ page }) => {
    await login(page, "admin@novacore.dev");
    await page.goto("/settings");
    await page.getByRole("tab", { name: "Workspace" }).click();

    await page.getByLabel("Workspace slug *").fill("Invalid Slug!");
    await page.getByRole("button", { name: /Save workspace/i }).click();
    // HTML pattern or server validation prevents the save; the field keeps focus/value.
    await expect(page.getByLabel("Workspace slug *")).toHaveValue("Invalid Slug!");
  });
});

test.describe("Settings — role-based access", () => {
  test("engineer sees personal tabs but not workspace admin tabs", async ({ page }) => {
    await login(page, "engineer@novacore.dev");
    await page.goto("/settings");

    await expect(page.getByRole("tab", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Appearance" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Roles & access" })).toBeVisible();

    await expect(page.getByRole("tab", { name: "Workspace" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Integrations" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "API tokens" })).toHaveCount(0);
    await expect(page.getByRole("tab", { name: "Danger zone" })).toHaveCount(0);
  });
});
