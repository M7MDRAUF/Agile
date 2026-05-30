import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 60_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // The production server (`next start`) fails fast on a weak/placeholder
    // AUTH_SECRET (BUG-H01). Inject a strong, non-placeholder signing key for
    // the e2e server so the suite boots deterministically without weakening the
    // dev `.env` or the runtime security guard. Next.js does not overwrite an
    // already-set process env var with a `.env` value.
    env: {
      AUTH_SECRET:
        process.env.AUTH_SECRET &&
        process.env.AUTH_SECRET.length >= 32 &&
        !/changeme|insecure|dev-?secret/i.test(process.env.AUTH_SECRET)
          ? process.env.AUTH_SECRET
          : "agileforge-e2e-signing-key-0123456789abcdefghijklmnop",
    },
  },
});
