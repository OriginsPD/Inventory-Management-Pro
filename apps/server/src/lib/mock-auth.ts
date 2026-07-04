import { env } from "@ims_pro/env/server";
import { initAuth } from "@ims_pro/auth";

export function getBetterAuth(useDb: boolean) {
  if (!useDb) {
    return null;
  }

  return initAuth();
}

export interface InMemoryUser {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordHash: string;
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

if (env.IMS_ENABLE_DEV_AUTH && env.IMS_DEV_ADMIN_EMAIL && env.IMS_DEV_ADMIN_PASSWORD) {
  mockUsers.set(env.IMS_DEV_ADMIN_EMAIL, {
    id: "00000000-0000-0000-0000-000000000000",
    name: "System Admin",
    email: env.IMS_DEV_ADMIN_EMAIL,
    role: "SUPER_USER",
    passwordHash: env.IMS_DEV_ADMIN_PASSWORD,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
} else if (env.IMS_ENABLE_DEV_AUTH) {
  console.warn(
    "IMS_ENABLE_DEV_AUTH is true, but IMS_DEV_ADMIN_EMAIL or IMS_DEV_ADMIN_PASSWORD is missing. Dev auth user was not seeded.",
  );
}
