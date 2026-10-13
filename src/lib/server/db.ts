/*
 * PostgreSQL access. Uses DATABASE_URL (any PostgreSQL 13+) when set; otherwise an
 * embedded PostgreSQL (PGlite).
 * - Locally the PGlite data directory lives in .data/pgdata.
 * - On Vercel, server instances have no lasting disk, so the PGlite database is saved to the
 *   project's private Blob store after every change and loaded from there when an instance starts.
 *   ETags make sure an instance never overwrites a newer copy saved by another instance.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Q = <T = any>(text: string, params?: unknown[]) => Promise<T[]>;
export interface Db {
  kind: "postgres" | "pglite";
  label: string;
  query: Q;
  exec: (sql: string) => Promise<void>;
  tx: <T>(fn: (q: Q) => Promise<T>) => Promise<T>;
  /* Reload from the saved copy if another instance changed it. No-op unless persisted. */
  refresh: (force?: boolean) => Promise<void>;
  /* Save the current database. No-op unless persisted. */
  save: () => Promise<void>;
}

const g = globalThis as unknown as { __pcbDb?: Promise<Db> };

export function db(): Promise<Db> {
  if (!g.__pcbDb) g.__pcbDb = connect().catch((e) => { g.__pcbDb = undefined; throw e; });
  return g.__pcbDb;
}

const SNAPSHOT = "pglite/pcb-database.tar.gz";
const READ_CHECK_MS = 4000;

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
      refresh: async () => {},
      save: async () => {},
    };
  }

  const { PGlite: PG } = await import("@electric-sql/pglite");
  const persisted = !!process.env.VERCEL && !!process.env.BLOB_READ_WRITE_TOKEN;
  let pg!: PGlite;
  let etag: string | null = null;
  let lastCheck = 0;
  let chain: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => { const run = chain.then(fn); chain = run.catch(() => {}); return run; };

  const loadRemote = async (): Promise<boolean> => {
    const { get } = await import("@vercel/blob");
    const r = await get(SNAPSHOT, { access: "private", useCache: false, ifNoneMatch: etag ?? undefined }).catch(() => null);
    lastCheck = Date.now();
    if (!r || r.statusCode === 304) return false;
    const data = await new Response(r.stream).blob();
    const next = await PG.create({ loadDataDir: data });
    const old = pg;
    pg = next;
    etag = r.blob.etag;
    // Let reads already running on the previous copy finish before closing it
    if (old) setTimeout(() => { old.close().catch(() => {}); }, 15000);
    return true;
  };

  if (persisted) {
    const loaded = await loadRemote();
    if (!loaded) pg = await PG.create();
  } else {
    const dir = process.env.PGLITE_DIR || path.join(process.cwd(), ".data", "pgdata");
    mkdirSync(path.dirname(dir), { recursive: true });
    pg = await PG.create(dir);
  }

  const query: Q = async (text, params = []) => (await pg.query(text, params as any[])).rows as any;
  return {
    kind: "pglite",
    label: "PostgreSQL (embedded)",
    query,
    exec: async (s) => { await pg.exec(s); },
    // Writers run one at a time; PGlite is single-connection
    tx: (fn) => serial(() => pg.transaction(async (t) => fn(async (text, params = []) => (await t.query(text, params as any[])).rows as any))),
    refresh: async (force = false) => {
      if (!persisted) return;
      if (!force && Date.now() - lastCheck < READ_CHECK_MS) return;
      await serial(() => loadRemote());
    },
    save: async () => {
      if (!persisted) return;
      await serial(async () => {
        const { put, BlobPreconditionFailedError } = await import("@vercel/blob");
        const file = await pg.dumpDataDir("gzip");
        try {
          const res = await put(SNAPSHOT, file, { access: "private", addRandomSuffix: false, allowOverwrite: true, contentType: "application/gzip", ...(etag ? { ifMatch: etag } : {}) });
          etag = res.etag;
        } catch (e) {
          // Another instance saved first: keep its copy so nothing it recorded is lost
          if (e instanceof BlobPreconditionFailedError) { await loadRemote(); return; }
          throw e;
        }
      });
    },
  };
}
