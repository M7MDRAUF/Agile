import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "e2e", ".next"],
    coverage: {
      // QA-007 / BUG-L13: enforce a coverage floor so regressions block CI.
      // Thresholds sit just below the measured coverage after Batch 7
      // (lines ~78%, statements ~79.5%, functions ~81.5%, branches ~69.4%).
      // Raise as coverage grows; never silently lower.
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/lib/**/*.{ts,tsx}"],
      exclude: ["src/lib/**/__tests__/**", "src/generated/**", "src/lib/db.ts", "src/lib/env.ts"],
      thresholds: {
        lines: 75,
        statements: 75,
        functions: 78,
        branches: 65,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
