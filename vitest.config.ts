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
      // QA-007: enforce a floor so coverage regressions block CI.
      // Thresholds reflect actual measured floor on `implement-production-readiness-fixes`
      // after Batch 7 partial. Raise as coverage grows; never silently lower.
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/lib/**/*.{ts,tsx}"],
      exclude: [
        "src/lib/**/__tests__/**",
        "src/generated/**",
        "src/lib/db.ts",
        "src/lib/env.ts",
      ],
      thresholds: {
        lines: 35,
        statements: 35,
        functions: 40,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
