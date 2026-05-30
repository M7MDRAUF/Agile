import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// BUG-H01: session.ts validates AUTH_SECRET at module load. Provide a strong,
// non-placeholder secret so auth modules are importable under test.
process.env.AUTH_SECRET ||= "test-auth-secret-0123456789abcdef0123456789abcdef";

afterEach(() => {
  cleanup();
});
