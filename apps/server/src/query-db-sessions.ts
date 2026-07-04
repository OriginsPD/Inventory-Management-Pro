import { env } from "@ims_pro/env/server";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
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
    console.log("Querying sessions...");
    const sessions = await db
      .select({
        sessionId: schema.sessions.id,
        expiresAt: schema.sessions.expiresAt,
        userId: schema.users.id,
        email: schema.users.email,
        role: schema.users.role,
      })
      .from(schema.sessions)
      .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id));
    console.log("SESSIONS_LIST_START");
    console.log(JSON.stringify(sessions, null, 2));
    console.log("SESSIONS_LIST_END");
  } catch (error) {
    console.error("FAILED QUERY ERROR IS:", error);
  } finally {
    await client.end();
  }
}

run();
