import type { NextRequest } from "next/server";
import { db } from "@/lib/server/db";
import { fail } from "@/lib/server/http";
import { hashPassword } from "@/lib/server/repo";
import { currentVersion, ROLES } from "@/lib/server/runtime";

/* POST /api/auth/signup { name, email, password, role, department } */
export async function POST(req: NextRequest) {
  try {
    await currentVersion();
    const b = await req.json();
    const name = String(b.name ?? "").trim(), email = String(b.email ?? "").trim().toLowerCase(), password = String(b.password ?? "");
    const role = ROLES.includes(b.role) ? b.role : null, department = String(b.department ?? "").trim();
    if (name.length < 3) return Response.json({ error: "Enter your full name." }, { status: 400 });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    if (password.length < 8) return Response.json({ error: "Use at least 8 characters for the password." }, { status: 400 });
    if (!role) return Response.json({ error: "Choose a role." }, { status: 400 });
    const d = await db();
    if ((await d.query(`select 1 from app_users where lower(email) = $1`, [email])).length) return Response.json({ error: "An account with this email already exists. Sign in instead." }, { status: 409 });
    await d.query(`insert into app_users (email, name, role, department, password_hash, last_login) values ($1,$2,$3,$4,$5, now())`, [email, name, role, department || null, hashPassword(password)]);
    await d.save();
    return Response.json({ user: { email, name, role, department } });
  } catch (e) {
    return fail(e);
  }
}
