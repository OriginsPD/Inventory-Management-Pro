import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

async function run() {
  console.log("⚡ Connecting and updating Neon DB schema...");

  try {
    // 1. Add customer_id column to device_audit_logs if it doesn't exist
    console.log("Adding customer_id column to device_audit_logs...");
    await db.execute(sql`
      ALTER TABLE device_audit_logs 
      ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;
    `);

    // 2. Add index for customer_id on device_audit_logs
    console.log("Creating index for customer_id on device_audit_logs...");
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS device_audit_logs_customer_id_idx ON device_audit_logs (customer_id);
    `);

    // 3. Create qc_reports table
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

    // 4. Create index for device_id on qc_reports
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
