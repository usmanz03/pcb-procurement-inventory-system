import { db } from "@/lib/server/db";
import { fail } from "@/lib/server/http";
import { ALL_TABLES, ARRAYS, MAPS } from "@/lib/server/repo";
import { currentVersion } from "@/lib/server/runtime";

const LABELS: Record<string, string> = {
  ...Object.fromEntries(Object.values(ARRAYS).map((a) => [a!.table, a!.label])),
  ...Object.fromEntries(Object.values(MAPS).map((m) => [m.table, m.label])),
  meta: "System metadata", configuration: "Configuration held as data", workflow_state: "Workflow state", item_opening: "Opening balances (migrated)",
  stock_ledger: "Stock ledger · append-only", audit_log: "Audit log · append-only, hash-chained",
};

/* GET /api/system — live database health for the System & compliance screen */
export async function GET() {
  try {
    const version = await currentVersion();
    const d = await db();
    const t0 = performance.now();
    await d.query("select 1");
    const latencyMs = performance.now() - t0;
    const [{ v: pg }] = await d.query(`select version() as v`);
    const tables = [];
    for (const t of ALL_TABLES) {
      const [r] = await d.query(`select count(*)::int as n, pg_total_relation_size($1::regclass)::bigint as bytes from ${t}`, [t]);
      tables.push({ name: t, label: LABELS[t] ?? t, rows: Number(r.n), bytes: Number(r.bytes) });
    }
    const [seeded] = await d.query(`select value from meta where key = 'seeded_at'`);
    const triggers = await d.query(`select event_object_table as t, trigger_name as n from information_schema.triggers where trigger_name like '%append_only' group by 1, 2`);
    return Response.json({
      engine: d.label, kind: d.kind, server: String(pg).split(" on ")[0], version, latencyMs, seededAt: seeded?.value ?? null,
      region: process.env.VERCEL_REGION ?? "local", runtime: `Node.js ${process.version}`, tables, appendOnly: triggers.map((x) => x.t),
    });
  } catch (e) {
    return fail(e);
  }
}
