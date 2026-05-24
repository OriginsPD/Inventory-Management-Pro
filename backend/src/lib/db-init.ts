import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq } from "drizzle-orm";
import { getBetterAuth } from "../auth-service.js";

export let useDb = false;

// Initialize connection test
export async function initDbConnection() {
  const url = process.env.DATABASE_URL;
  console.log(`🔍 [IMS API] DATABASE_URL detected: ${url ? url.substring(0, 40) + '...' : 'NOT SET'}`);
  try {
    await db.select().from(schema.deviceModels).limit(1);
    useDb = true;
    console.log("⚡ [IMS API] Successfully connected to Neon DB / Postgres instance.");

    // Seed default admin user if not exists
    try {
      const existingAdmin = await db.select().from(schema.users).where(eq(schema.users.email, "admin@imspro.com")).limit(1);
      if (existingAdmin.length === 0) {
        console.log("Seeding default Super User admin@imspro.com in database...");
        const auth = getBetterAuth(true);
        if (auth) {
          await auth.api.signUpEmail({
            body: {
              email: "admin@imspro.com",
              password: "AdminPass123!",
              name: "System Admin"
            }
          });
          // Update the role to SUPER_USER
          await db.update(schema.users).set({ role: "SUPER_USER" }).where(eq(schema.users.email, "admin@imspro.com"));
          console.log("⚡ Super User admin@imspro.com seeded successfully.");
        }
      }
    } catch (err) {
      console.error("Failed to seed default Super User in database:", err);
    }
  } catch (e: any) {
    console.log("⚠️ [IMS API] Neon DB connection failed.");
    console.log(`   ❌ Error: ${e?.message || String(e)}`);
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
      console.error("🚨 [IMS API] Database is configured but connection failed. Crashing server to prevent silent data loss.");
      process.exit(1);
    }
    console.log("ℹ️ [IMS API] Falling back to local In-Memory Database engine.");
    useDb = false;
  }
}

export function setUseDb(val: boolean) {
  useDb = val;
}
