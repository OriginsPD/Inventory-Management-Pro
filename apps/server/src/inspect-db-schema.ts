import { db } from "@ims_pro/db";
import { sql } from "drizzle-orm";

async function run() {
  console.log("Querying table columns...");
  const result = await db.execute(sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'device_audit_logs';
  `);
  console.log("Columns of device_audit_logs:", result);
}

run().catch(console.error);
