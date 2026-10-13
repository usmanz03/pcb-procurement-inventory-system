import type { NextRequest } from "next/server";
import { ACTION_TAB, type ActionName } from "@/lib/engine";
import { db } from "@/lib/server/db";
import { fail, ipOf, roleOf, userOf } from "@/lib/server/http";
import { runAction } from "@/lib/server/runtime";

/* POST /api/action  { name, args, clientId }  header x-pcb-role */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body?.name as ActionName;
    if (!name || !(name in ACTION_TAB)) return Response.json({ error: `Unknown action ${name}` }, { status: 400 });
    const args = Array.isArray(body.args) ? body.args : [];
    const out = await runAction(name, args, { role: roleOf(req), ip: ipOf(req), clientId: typeof body.clientId === "string" ? body.clientId : null, user: userOf(req) });
    const d = await db();
    const head = Number((await d.query(`select coalesce(max(id), 0) as id from audit_log`))[0].id);
    return Response.json({ ...out, head }, { status: out.result.ok ? 200 : 422 });
  } catch (e) {
    return fail(e);
  }
}
