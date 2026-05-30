import { authenticator } from "otplib";
import { hash as bcryptHash } from "bcryptjs";
import Database from "better-sqlite3";
import path from "node:path";
import { test, expect, DEMO_PASSWORD } from "./helpers";

// MFA login regression test for SEC-001/SEC-002. Enables MFA on a fixture
// account directly in the DB, then verifies that:
//  1. Password-only login does NOT reach the dashboard.
//  2. A wrong TOTP code is rejected with an alert.
//  3. A valid TOTP code completes the sign-in.
// After the test, MFA is disabled again so other suites are unaffected.

const TEST_EMAIL = "qa@novacore.dev";

// Use the raw better-sqlite3 driver instead of the generated Prisma client so
// this spec does not load Prisma's runtime (which is incompatible with
// Playwright's ESM loader) into the test process. Prisma 7's config resolves
// the `file:` URL relative to the working directory (project root), matching
// where the running app reads/writes its sqlite db.
function openDb() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const rel = url.replace(/^file:/, "");
  return new Database(path.resolve(process.cwd(), rel));
}

function setMfa(
  db: ReturnType<typeof openDb>,
  data: { mfaEnabled: boolean; mfaSecret: string | null; mfaRecoveryCodes: string | null },
) {
  db.prepare(
    `UPDATE "User" SET "mfaEnabled" = ?, "mfaSecret" = ?, "mfaRecoveryCodes" = ? WHERE "email" = ?`,
  ).run(data.mfaEnabled ? 1 : 0, data.mfaSecret, data.mfaRecoveryCodes, TEST_EMAIL);
}

test.describe("MFA login challenge (SEC-001 / SEC-002 regression)", () => {
  let secret: string;
  const db = openDb();

  test.beforeAll(async () => {
    secret = authenticator.generateSecret(20);
    // Use bcrypt-hashed dummy recovery codes so the column shape matches prod.
    const codes = ["AAAA-AAAA", "BBBB-BBBB"];
    const hashed = (await Promise.all(codes.map((c) => bcryptHash(c, 10)))).join("\n");
    setMfa(db, { mfaEnabled: true, mfaSecret: secret, mfaRecoveryCodes: hashed });
  });

  test.afterAll(async () => {
    setMfa(db, { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: null });
    db.close();
  });

  test("MFA-enabled user is challenged for a TOTP and a wrong code is rejected", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should not have been redirected to a protected route.
    await expect(page).toHaveURL(/\/login/);
    // MFA stage UI is rendered.
    await expect(page.getByRole("heading", { name: /two-factor authentication/i })).toBeVisible();

    // Wrong code → alert, still on /login.
    await page.getByLabel(/authentication code/i).fill("000000");
    await page.getByRole("button", { name: /verify and sign in/i }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("MFA-enabled user can complete sign-in with a valid TOTP", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(TEST_EMAIL);
    await page.getByLabel("Password").fill(DEMO_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: /two-factor authentication/i })).toBeVisible();

    const code = authenticator.generate(secret);
    await page.getByLabel(/authentication code/i).fill(code);
    await page.getByRole("button", { name: /verify and sign in/i }).click();

    await page.waitForURL(/\/(dashboard|work-items|projects)/, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/(dashboard|work-items|projects)/);
  });
});
