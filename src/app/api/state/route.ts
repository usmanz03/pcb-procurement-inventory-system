import type { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { fail } from "@/lib/server/http";
import { currentVersion, snapshot } from "@/lib/server/runtime";

/* GET /api/state?since=<version>&after=<auditId> — full state when it changed, plus new audit events */
export async function GET(req: NextRequest) {
  try {
    const since = Number(req.nextUrl.searchParams.get("since") ?? -1);
    const after = Number(req.nextUrl.searchParams.get("after") ?? 0);
    const version = await currentVersion();
    if (since === version) return Response.json({ version, unchanged: true });
    const snap = await snapshot();
    const d = await db();
    const events = after > 0 ? await d.query(`select id, at, actor, role, client_id, title, description, badge from audit_log where id > $1 order by id desc limit 8`, [after]) : [];
    const head = Number((await d.query(`select coalesce(max(id), 0) as id from audit_log`))[0].id);
    return Response.json({ version: snap.version, state: snap.state, events, head, engine: d.label });
  } catch (e) {
    return fail(e);
  }
}
