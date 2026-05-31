import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './db/schema.js';

const connectionString = process.env.DATABASE_URL || "postgresql://neondb_owner:npg_Jt5IqaESN1uD@ep-dry-smoke-aq6inpdb-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

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
