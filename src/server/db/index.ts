import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '../env';
import * as schema from './schema';

/**
 * One pooled connection per process. On serverless the process is reused
 * across invocations, so a small pool with an idle timeout keeps warm
 * connections without exhausting the database's connection limit.
 */
let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof buildDb> | undefined;

function buildDb(sql: ReturnType<typeof postgres>) {
  return drizzle(sql, { schema, casing: 'snake_case' });
}

export function getDb() {
  if (!database) {
    client = postgres(env.databaseUrl, {
      max: env.isProduction ? 5 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false
    });
    database = buildDb(client);
  }
  return database;
}

/** Closes the pool. Only used by scripts and tests. */
export async function closeDb() {
  await client?.end({ timeout: 5 });
  client = undefined;
  database = undefined;
}

export type Db = ReturnType<typeof getDb>;
export { schema };
