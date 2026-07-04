import { env } from "@ims_pro/env/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@ims_pro/db/schema/ims";

const connectionString = env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function run() {
  try {
    console.log("Querying users...");
    const users = await db.select().from(schema.users);
    console.log("USERS_LIST_START");
    console.log(JSON.stringify(users, null, 2));
    console.log("USERS_LIST_END");
  } catch (error) {
    console.error("FAILED QUERY ERROR IS:", error);
  } finally {
    await client.end();
  }
}

run();
