import { env } from "@ims_pro/env/server";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function createDb() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured");
  }

  if (!_db) {
    client = postgres(env.DATABASE_URL);
    _db = drizzle(client, { schema });
  }

  return _db;
}

export const db = env.DATABASE_URL ? createDb() : (undefined as unknown as ReturnType<typeof createDb>);

export type Db = NonNullable<typeof db>;
