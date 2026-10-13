import { db } from "@/lib/server/db";
import { fail } from "@/lib/server/http";
import { currentVersion } from "@/lib/server/runtime";

/* POST /api/audit/tamper — demonstrates that the database itself refuses to alter history */
export async function POST() {
  try {
    await currentVersion();
    const d = await db();
    const attempts = [
      { label: "Change who performed a past action", sql: "update audit_log set actor = 'Someone else' where id = (select min(id) from audit_log)" },
      { label: "Delete the most recent action", sql: "delete from audit_log where id = (select max(id) from audit_log)" },
      { label: "Add 100 units to a past stock movement", sql: "update stock_ledger set qty = qty + 100 where id = (select min(id) from stock_ledger)" },
    ];
    const results = [];
    for (const a of attempts) {
      try {
        await d.tx(async (q) => { await q(a.sql); });
        results.push({ ...a, blocked: false, message: "Change was applied" });
      } catch (e) {
        results.push({ ...a, blocked: true, message: e instanceof Error ? e.message : String(e) });
      }
    }
    return Response.json({ results });
  } catch (e) {
    return fail(e);
  }
}
