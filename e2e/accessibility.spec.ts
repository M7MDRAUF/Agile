import AxeBuilder from "@axe-core/playwright";
import { test, expect, login } from "./helpers";

/**
 * A11Y-001 — axe smoke testing.
 *
 * Runs axe-core against a representative set of routes and asserts there are
 * no `serious` or `critical` accessibility violations. Minor/moderate
 * violations are logged via test annotations so they remain visible without
 * making the gate impossible to reach on day one.
 *
 * Admin credentials come from prisma/seed.ts (DEMO_PASSWORD shared with the
 * other e2e specs).
 *
 * TODO — expand coverage to remaining routes once the baseline is green:
 *   /sprints, /sprints/[id], /qa, /qa/[id], /teams, /teams/[id],
 *   /users, /users/[id], /admin, /reports, /projects/[id],
 *   /projects/[id]/reports, /work-items/[id], /work-items/new,
 *   /projects/new, /notifications, /search.
 */

const BLOCKING_IMPACTS = new Set(["serious", "critical"] as const);
const ADMIN_EMAIL = "admin@novacore.dev";

/** Routes that require an authenticated admin session. */
const AUTHENTICATED_ROUTES = [
  "/dashboard",
  "/my-work",
  "/work-items",
  "/backlog",
  "/boards/kanban",
  "/projects",
  "/reports",
  "/settings",
] as const;

async function runAxe(page: import("@playwright/test").Page, label: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const blocking = results.violations.filter((v) =>
    BLOCKING_IMPACTS.has((v.impact ?? "minor") as "serious" | "critical"),
  );
  const informational = results.violations.filter(
    (v) => !BLOCKING_IMPACTS.has((v.impact ?? "minor") as "serious" | "critical"),
  );

  if (informational.length > 0) {
    test.info().annotations.push({
      type: "axe-info",
      description: `${label}: ${informational.length} non-blocking axe finding(s) — ${informational
        .map((v) => `${v.id}(${v.impact ?? "minor"})`)
        .join(", ")}`,
    });
  }

  expect(
    blocking,
    `${label}: serious/critical axe violations — ${blocking
      .map((v) => `${v.id}: ${v.help}`)
      .join("; ")}`,
  ).toEqual([]);
}

test.describe("Accessibility — axe smoke", () => {
  test("/login has no serious/critical axe violations", async ({ page }) => {
    await page.goto("/login");
    await runAxe(page, "/login");
  });

  for (const route of AUTHENTICATED_ROUTES) {
    test(`${route} has no serious/critical axe violations`, async ({ page }) => {
      await login(page, ADMIN_EMAIL);
      await page.goto(route);
      await page.waitForLoadState("networkidle").catch(() => {
        /* some routes stream — fall back to whatever loaded */
      });
      await runAxe(page, route);
    });
  }

  // Dark-mode pass: contrast tokens differ in the dark theme, so re-run axe
  // against a representative set of routes (including charts on /reports) with
  // the `.dark` class forced on, mirroring the appearance setting.
  const DARK_ROUTES = ["/dashboard", "/work-items", "/boards/kanban", "/reports"] as const;
  for (const route of DARK_ROUTES) {
    test(`${route} (dark mode) has no serious/critical axe violations`, async ({ page }) => {
      await login(page, ADMIN_EMAIL);
      await page.goto(route);
      await page.waitForLoadState("networkidle").catch(() => {
        /* some routes stream — fall back to whatever loaded */
      });
      await page.evaluate(() => {
        document.documentElement.classList.add("dark");
        document.getElementById("app-shell")?.classList.add("dark");
      });
      await runAxe(page, `${route} (dark)`);
    });
  }
});
