import { db } from "@ims_pro/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("⚡ Connecting and updating Neon DB schema...");

  try {
    console.log("Adding customer_id column to device_audit_logs...");
    await db.execute(sql`
      ALTER TABLE device_audit_logs 
      ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
    `);

    console.log("Creating index for customer_id on device_audit_logs...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS device_audit_logs_customer_id_idx ON device_audit_logs (customer_id);
    `);

    console.log("Ensuring auth table id defaults...");
    await db.execute(sql`
      ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    `);
    await db.execute(sql`
      ALTER TABLE sessions ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    `);
    await db.execute(sql`
      ALTER TABLE accounts ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    `);
    await db.execute(sql`
      ALTER TABLE verifications ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    `);

    console.log("Adding user_id column to device_audit_logs...");
    await db.execute(sql`
      ALTER TABLE device_audit_logs
      ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
    `);

    console.log("Creating index for user_id on device_audit_logs...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS device_audit_logs_user_id_idx ON device_audit_logs (user_id);
    `);

    console.log("Creating qc_reports table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS qc_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
        technician_id VARCHAR(255) NOT NULL DEFAULT 'Default Technician',
        items JSONB NOT NULL DEFAULT '[]',
        overall_status VARCHAR(50) NOT NULL,
        completed_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log("Creating index for device_id on qc_reports...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS qc_reports_device_id_idx ON qc_reports (device_id);
    `);

    console.log("✅ Neon DB schema updated successfully!");
  } catch (error) {
    console.error("❌ Error updating database schema:", error);
    process.exit(1);
  }
}

run().then(() => process.exit(0));
