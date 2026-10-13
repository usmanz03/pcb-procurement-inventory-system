import type { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { fail } from "@/lib/server/http";
import { currentVersion } from "@/lib/server/runtime";

/* GET /api/audit?limit=&q=&actor=&id= — tamper-evident activity log (FR-11.8, NFR-3) */
export async function GET(req: NextRequest) {
  try {
    await currentVersion();
    const p = req.nextUrl.searchParams;
    const d = await db();
    const id = p.get("id");
    if (id) {
      const r = await d.query(`select * from audit_log where id = $1`, [Number(id)]);
      return r.length ? Response.json(r[0]) : Response.json({ error: "Not found" }, { status: 404 });
    }
    const limit = Math.min(500, Number(p.get("limit") ?? 200));
    const q = `%${p.get("q") ?? ""}%`;
    const rows = await d.query(
      `select id, at, actor, role, ip, action, title, description, badge, display_time, prev_hash, hash, jsonb_array_length(coalesce(changes, '[]'::jsonb)) as change_count
       from audit_log where (title ilike $1 or description ilike $1 or actor ilike $1 or coalesce(action,'') ilike $1) order by id desc limit $2`, [q, limit]);
    const total = Number((await d.query(`select count(*)::int as n from audit_log`))[0].n);
    return Response.json({ total, rows });
  } catch (e) {
    return fail(e);
  }
}
