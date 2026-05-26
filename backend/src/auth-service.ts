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
    try {
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
        secret: process.env.BETTER_AUTH_SECRET || "ims-pro-super-secret-key-123456789",
        baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3002",
        trustedOrigins: [process.env.CORS_ORIGIN || "http://localhost:5173"],
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
    } catch (e) {
      console.error("Failed to initialize Better Auth with database, falling back to mock", e);
    }
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

// Seed the default admin in memory
const adminId = "00000000-0000-0000-0000-000000000000";
mockUsers.set("admin@imspro.com", {
  id: adminId,
  name: "System Admin",
  email: "admin@imspro.com",
  role: "SUPER_USER",
  passwordHash: "AdminPass123!",
  createdAt: new Date(),
  updatedAt: new Date(),
});
