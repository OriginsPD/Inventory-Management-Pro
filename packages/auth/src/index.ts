import { createDb } from "@ims_pro/db";
import * as imsSchema from "@ims_pro/db/schema/ims";
import { env, getTrustedOrigins } from "@ims_pro/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: imsSchema.users,
        session: imsSchema.sessions,
        account: imsSchema.accounts,
        verification: imsSchema.verifications,
      },
    }),
    advanced: {
      database: {
        generateId: "uuid",
      },
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: getTrustedOrigins(),
    emailAndPassword: {
      enabled: true,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "REVIEWER",
          input: true,
        },
      },
    },
  });
}

let authInstance: ReturnType<typeof createAuth> | null = null;

export function initAuth() {
  if (!env.DATABASE_URL) {
    return null;
  }

  if (!authInstance) {
    authInstance = createAuth();
  }

  return authInstance;
}

export function getAuth() {
  return authInstance;
}

export const auth = initAuth() ?? (null as unknown as ReturnType<typeof createAuth>);
