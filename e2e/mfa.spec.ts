import { authenticator } from "otplib";
import { hash as bcryptHash } from "bcryptjs";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { test, expect, DEMO_PASSWORD } from "./helpers";

// MFA login regression test for SEC-001/SEC-002. Enables MFA on a fixture
// account directly in the DB, then verifies that:
//  1. Password-only login does NOT reach the dashboard.
//  2. A wrong TOTP code is rejected with an alert.
//  3. A valid TOTP code completes the sign-in.
// After the test, MFA is disabled again so other suites are unaffected.

const TEST_EMAIL = "qa@novacore.dev";

function makePrisma() {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

test.describe("MFA login challenge (SEC-001 / SEC-002 regression)", () => {
  let secret: string;
  const prisma = makePrisma();

  test.beforeAll(async () => {
    secret = authenticator.generateSecret(20);
    // Use bcrypt-hashed dummy recovery codes so the column shape matches prod.
    const codes = ["AAAA-AAAA", "BBBB-BBBB"];
    const hashed = (await Promise.all(codes.map((c) => bcryptHash(c, 10)))).join("\n");
    await prisma.user.update({
      where: { email: TEST_EMAIL },
      data: { mfaEnabled: true, mfaSecret: secret, mfaRecoveryCodes: hashed },
    });
  });

  test.afterAll(async () => {
    await prisma.user.update({
      where: { email: TEST_EMAIL },
      data: { mfaEnabled: false, mfaSecret: null, mfaRecoveryCodes: null },
    });
    await prisma.$disconnect();
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
