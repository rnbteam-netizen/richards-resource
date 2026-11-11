// Database wiring.
// Production (Render + Neon): DATABASE_URL is set in the Render
// dashboard (Environment) — a pooled Neon Postgres connection string
// with sslmode=require. It is never committed, never logged, never
// sent in chat. See README.md.
// Local development / verification only: when DATABASE_URL is NOT set,
// an in-memory Postgres (pg-mem) is used through the exact same SQL
// queries, so `npm start` works with no account and no card. That
// fallback must never be relied on in production — Render always sets
// DATABASE_URL, and data in the fallback disappears on restart.
//
// The pool is used directly with parameterized SQL (see actions.ts).
// Drizzle-orm/pg-core defines the tables in schema.ts and the
// migration in drizzle/0001_public.sql; Drizzle's query builder is
// deliberately not used for execution, because its node-postgres
// driver issues prepared queries with rowMode "array", which pg-mem
// does not support — raw SQL keeps one verified code path for both.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { newDb } from "pg-mem";
import pg from "pg";

const { Pool } = pg;
type PoolType = pg.Pool;

export type Db = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

const here = dirname(fileURLToPath(import.meta.url));
function findSchemaSql(): string {
  const candidates = [
    join(here, "..", "..", "drizzle", "0001_public.sql"),
    join(here, "..", "drizzle", "0001_public.sql"),
    join(process.cwd(), "drizzle", "0001_public.sql"),
  ];
  for (const p of candidates) {
    try { return readFileSync(p, "utf8"); } catch { /* try next */ }
  }
  throw new Error("drizzle/0001_public.sql not found");
}

export function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (url) {
    return new Pool({ connectionString: url, ssl: { rejectUnauthorized: false }, max: 5 }) as unknown as Db;
  }
  // Local-only in-memory Postgres. Same SQL, same schema.
  // eslint-disable-next-line no-console
  console.log("[db] DATABASE_URL not set — using in-memory Postgres for local development only. Data will not persist across restarts.");
  const mem = newDb();
  const { Pool: MemPool } = mem.adapters.createPg();
  return new MemPool() as unknown as Db;
}

export async function migrate(db: Db): Promise<void> {
  const sql = findSchemaSql();
  await db.query(sql);
}

// Re-exported for callers that need the concrete pool type.
export type { PoolType };
