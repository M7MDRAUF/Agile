import { test as base, expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "Password123!";

export async function login(page: Page, email: string, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|work-items|projects)/, { timeout: 30_000 });
}

export const test = base;
export { expect };
