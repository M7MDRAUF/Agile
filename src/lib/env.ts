import { z } from "zod";

// OPS-008 / SEC-010: validate critical environment variables at startup.
// Importing this module asserts the schema; failures throw a descriptive error
// so misconfigured deployments fail fast rather than silently degrading.

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  AUTH_SECRET: z
    .string({ error: "AUTH_SECRET is required" })
    .min(32, "AUTH_SECRET must be at least 32 characters of high-entropy value"),
  DATABASE_URL: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

export function getEnv(): AppEnv {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${message}`);
  }
  // Production-only assertions.
  if (parsed.data.NODE_ENV === "production") {
    if (/changeme|insecure|dev-?secret/i.test(parsed.data.AUTH_SECRET)) {
      throw new Error("AUTH_SECRET is a development placeholder; rotate before deploying.");
    }
  }
  cached = parsed.data;
  return cached;
}
