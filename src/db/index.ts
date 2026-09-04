import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsDrizzleDb?: NodePgDatabase<typeof schema>;
};

export function getPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Please set DATABASE_URL in your .env.local file (e.g. DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db)"
    );
  }

  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    globalForDb.__arenaNextJsPostgresqlPool = new Pool({
      connectionString: databaseUrl,
    });
  }
  return globalForDb.__arenaNextJsPostgresqlPool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!globalForDb.__arenaNextJsDrizzleDb) {
    const p = getPool();
    globalForDb.__arenaNextJsDrizzleDb = drizzle(p, { schema });
  }
  return globalForDb.__arenaNextJsDrizzleDb;
}

export const pool = new Proxy({} as Pool, {
  get(_target, prop, receiver) {
    const actualPool = getPool();
    const val = Reflect.get(actualPool, prop, receiver);
    return typeof val === "function" ? val.bind(actualPool) : val;
  },
});

export const db = new Proxy({} as NodePgDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const actualDb = getDb();
    const val = Reflect.get(actualDb, prop, receiver);
    return typeof val === "function" ? val.bind(actualDb) : val;
  },
});
