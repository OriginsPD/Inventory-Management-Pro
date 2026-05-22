import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL || 'postgres://ims_user:ims_password@localhost:5433/ims_pro_db';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
