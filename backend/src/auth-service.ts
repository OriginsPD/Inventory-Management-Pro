import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

// Determine if we should instantiate database adapter
// We use a lazy configuration or export a function to allow dynamic fallback
let authInstance: any = null;

export function getBetterAuth(useDb: boolean) {
  if (authInstance) return authInstance;

  if (useDb) {
    const authSecret = process.env.BETTER_AUTH_SECRET;
    if (!authSecret && process.env.NODE_ENV === "production") {
      throw new Error("BETTER_AUTH_SECRET is required in production");
    }

    authInstance = betterAuth({
      database: drizzleAdapter(db, {
          provider: "pg",
          schema: {
            user: schema.users,
            session: schema.sessions,
            account: schema.accounts,
            verification: schema.verifications,
          }
      }),
      secret: authSecret || "ims-pro-dev-only-auth-secret-change-before-production",
      baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3002",
      trustedOrigins: (process.env.TRUSTED_ORIGINS || process.env.CORS_ORIGIN || "http://localhost:5173")
        .split(",")
        .map(origin => origin.trim())
        .filter(Boolean),
      emailAndPassword: {
        enabled: true
      },
      user: {
        additionalFields: {
          role: {
            type: "string",
            defaultValue: "REVIEWER",
            input: true,
          }
        }
      }
    });
    return authInstance;
  }

  // If useDb is false or initialization failed, we return a mock object
  return null;
}

// In-Memory Fallback Structures
export interface InMemoryUser {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordHash: string; // cleartext password for mock storage
  createdAt: Date;
  updatedAt: Date;
}

export interface InMemorySession {
  id: string;
  userId: string;
  token: string;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const mockUsers = new Map<string, InMemoryUser>();
export const mockSessions = new Map<string, InMemorySession>();

// Dev-only fallback user. Disabled unless explicitly configured.
const devAuthEnabled = process.env.IMS_ENABLE_DEV_AUTH === "true";
const devAdminEmail = process.env.IMS_DEV_ADMIN_EMAIL;
const devAdminPassword = process.env.IMS_DEV_ADMIN_PASSWORD;

if (devAuthEnabled && devAdminEmail && devAdminPassword) {
  mockUsers.set(devAdminEmail, {
    id: "00000000-0000-0000-0000-000000000000",
    name: "System Admin",
    email: devAdminEmail,
    role: "SUPER_USER",
    passwordHash: devAdminPassword,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
} else if (devAuthEnabled) {
  console.warn("IMS_ENABLE_DEV_AUTH is true, but IMS_DEV_ADMIN_EMAIL or IMS_DEV_ADMIN_PASSWORD is missing. Dev auth user was not seeded.");
}
