/*
 * PostgreSQL access. Uses DATABASE_URL (any PostgreSQL 13+) when set; otherwise an
 * embedded PostgreSQL (PGlite) persisted under .data/pgdata, so the system runs with no setup.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Q = <T = any>(text: string, params?: unknown[]) => Promise<T[]>;
export interface Db {
  kind: "postgres" | "pglite";
  label: string;
  query: Q;
  exec: (sql: string) => Promise<void>;
  tx: <T>(fn: (q: Q) => Promise<T>) => Promise<T>;
}

const g = globalThis as unknown as { __pcbDb?: Promise<Db> };

export function db(): Promise<Db> {
  if (!g.__pcbDb) g.__pcbDb = connect().catch((e) => { g.__pcbDb = undefined; throw e; });
  return g.__pcbDb;
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { default: postgres } = await import("postgres");
    const sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20, onnotice: () => {} });
    const query: Q = (text, params = []) => sql.unsafe(text, params as any[]) as any;
    return {
      kind: "postgres",
      label: `PostgreSQL · ${new URL(url).hostname}`,
      query,
      exec: async (s) => { await sql.unsafe(s); },
      tx: (fn) =>
        sql.begin(async (t) => {
          const q: Q = (text, params = []) => t.unsafe(text, params as any[]) as any;
          await q("select pg_advisory_xact_lock(7231)");
          return fn(q);
        }) as any,
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || (process.env.VERCEL ? "/tmp/pcb-pgdata" : path.join(process.cwd(), ".data", "pgdata"));
  mkdirSync(path.dirname(dir), { recursive: true });
  const pg = await PGlite.create(dir);
  const query: Q = async (text, params = []) => (await pg.query(text, params as any[])).rows as any;
  let chain: Promise<unknown> = Promise.resolve();
  return {
    kind: "pglite",
    label: process.env.VERCEL ? "PostgreSQL (embedded, per instance)" : "PostgreSQL (embedded · .data/pgdata)",
    query,
    exec: async (s) => { await pg.exec(s); },
    // Serialise writers in-process; PGlite is single-connection
    tx: (fn) => {
      const run = chain.then(() => pg.transaction(async (t) => fn(async (text, params = []) => (await t.query(text, params as any[])).rows as any)));
      chain = run.catch(() => {});
      return run as any;
    },
  };
}
