import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const devAuthSecretDefault = "ims-pro-dev-only-auth-secret-change-before-production";

export const env = createEnv({
  server: {
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().default(3002),
    DATABASE_URL: z.string().min(1).optional(),
    BETTER_AUTH_SECRET: z
      .string()
      .min(32)
      .optional()
      .default(devAuthSecretDefault),
    BETTER_AUTH_URL: z.url().optional().default("http://localhost:3002"),
    CORS_ORIGIN: z.url().optional().default("http://localhost:3001"),
    TRUSTED_ORIGINS: z.string().optional(),
    IMS_BOOTSTRAP_ADMIN_EMAIL: z.string().email().optional(),
    IMS_BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),
    IMS_ENABLE_DEV_AUTH: z
      .enum(["true", "false"])
      .optional()
      .transform((v) => v === "true"),
    IMS_DEV_ADMIN_EMAIL: z.string().email().optional(),
    IMS_DEV_ADMIN_PASSWORD: z.string().optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});

if (env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET is required in production");
}

export function getTrustedOrigins(): string[] {
  const configured = (env.TRUSTED_ORIGINS || env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return configured;
  }

  return env.NODE_ENV === "production" ? [] : [env.CORS_ORIGIN];
}
