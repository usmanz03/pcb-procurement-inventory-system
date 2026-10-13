import type { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { fail } from "@/lib/server/http";
import { checkPassword } from "@/lib/server/repo";
import { currentVersion } from "@/lib/server/runtime";

/* POST /api/auth/login { email, password } */
export async function POST(req: NextRequest) {
  try {
    await currentVersion();
    const { email, password } = await req.json();
    const d = await db();
    const [u] = await d.query(`select id, email, name, role, department, password_hash from app_users where lower(email) = lower($1)`, [String(email ?? "").trim()]);
    if (!u || !checkPassword(String(password ?? ""), u.password_hash)) return Response.json({ error: "The email or password is not correct." }, { status: 401 });
    await d.query(`update app_users set last_login = now() where id = $1`, [u.id]);
    return Response.json({ user: { email: u.email, name: u.name, role: u.role, department: u.department } });
  } catch (e) {
    return fail(e);
  }
}
