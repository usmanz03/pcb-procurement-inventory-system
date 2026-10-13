import type { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { fail, roleOf } from "@/lib/server/http";
import { resetDemo } from "@/lib/server/runtime";

/* POST /api/reset — reload the migrated baseline (demo environments only) */
export async function POST(req: NextRequest) {
  try {
    if (roleOf(req) === "auditor") return Response.json({ error: "Read-only role" }, { status: 403 });
    const snap = await resetDemo();
    const head = Number((await (await db()).query(`select coalesce(max(id), 0) as id from audit_log`))[0].id);
    return Response.json({ ...snap, head });
  } catch (e) {
    return fail(e);
  }
}
