import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { getBetterAuth } from "../auth-service.js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsFolder = path.resolve(__dirname, "../../drizzle");

export let useDb = false;

function isExistingObjectMigrationError(error: unknown) {
  let current = error as { code?: string; message?: string; cause?: unknown } | undefined;

  for (let depth = 0; current && depth < 5; depth += 1) {
    if (
      current.code === "42710" ||
      current.code === "42P07" ||
      /already exists/i.test(current.message ?? "")
    ) {
      return true;
    }

    current = current.cause as typeof current;
  }

  return false;
}

async function assertSchemaCompatible() {
  const result = await db.execute(sql`
    select
      to_regtype('public.asset_type') is not null as has_asset_type,
      to_regtype('public.customer_type') is not null as has_customer_type,
      to_regtype('public.device_status') is not null as has_device_status,
      to_regclass('public.device_models') is not null as has_device_models,
      to_regclass('public.devices') is not null as has_devices,
      to_regclass('public.users') is not null as has_users,
      exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'device_audit_logs'
          and column_name = 'user_id'
      ) as has_audit_user_id
  `);

  const [row] = result as unknown as Array<Record<string, boolean>>;
  const missing = Object.entries(row ?? {})
    .filter(([, exists]) => !exists)
    .map(([name]) => name.replace(/^has_/, ""));

  if (missing.length > 0) {
    throw new Error(`Database schema is incomplete or outdated. Missing: ${missing.join(", ")}`);
  }
}

// Initialize connection test
export async function initDbConnection() {
  const url = process.env.DATABASE_URL;
  console.log(`🔍 [IMS API] DATABASE_URL configured: ${url ? "yes" : "no"}`);
  try {
    if (url) {
      console.log("🔄 Running database migrations...");
      try {
        await migrate(db, { migrationsFolder });
        console.log("✅ Database migrations completed successfully.");
      } catch (migrationError) {
        if (!isExistingObjectMigrationError(migrationError)) {
          throw migrationError;
        }

        console.warn("⚠️ Database migration history is missing, but schema objects already exist. Validating schema compatibility...");
      }
    }

    if (url) {
      await assertSchemaCompatible();
    }

    await db.select().from(schema.deviceModels).limit(1);
    useDb = true;
    console.log("⚡ [IMS API] Successfully connected to Neon DB / Postgres instance.");
    getBetterAuth(true);

    // Seed a bootstrap admin only when explicitly configured.
    try {
      const bootstrapEmail = process.env.IMS_BOOTSTRAP_ADMIN_EMAIL;
      const bootstrapPassword = process.env.IMS_BOOTSTRAP_ADMIN_PASSWORD;
      if (!bootstrapEmail || !bootstrapPassword) {
        console.warn("Bootstrap admin seed skipped. Set IMS_BOOTSTRAP_ADMIN_EMAIL and IMS_BOOTSTRAP_ADMIN_PASSWORD for first-run setup.");
        return;
      }

      const existingAdmin = await db.select().from(schema.users).where(eq(schema.users.email, bootstrapEmail)).limit(1);
      if (existingAdmin.length === 0) {
        console.log(`Seeding bootstrap Super User ${bootstrapEmail} in database...`);
        const auth = getBetterAuth(true);
        if (auth) {
          await auth.api.signUpEmail({
            body: {
              email: bootstrapEmail,
              password: bootstrapPassword,
              name: "System Admin"
            }
          });
          // Update the role to SUPER_USER
          await db.update(schema.users).set({ role: "SUPER_USER" }).where(eq(schema.users.email, bootstrapEmail));
          console.log(`⚡ Bootstrap Super User ${bootstrapEmail} seeded successfully.`);
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
