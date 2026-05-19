import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL_NON_POOLING ??
  process.env.POSTGRES_URL!;

const globalForDb = globalThis as unknown as { _pgClient?: postgres.Sql };

// Reuse the client in dev to avoid exhausting connections on hot reloads
if (!globalForDb._pgClient) {
  globalForDb._pgClient = postgres(connectionString, { prepare: false, max: 5 });
}

export const client = globalForDb._pgClient;
export const db = drizzle(client, { schema });
