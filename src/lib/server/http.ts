import type { NextRequest } from "next/server";
import type { RoleKey } from "@/lib/types";
import { ROLES } from "./runtime";

export const roleOf = (req: NextRequest): RoleKey => {
  const r = req.headers.get("x-pcb-role") as RoleKey | null;
  return r && ROLES.includes(r) ? r : "auditor";
};
export const ipOf = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "127.0.0.1";
export const fail = (e: unknown, status = 500) => Response.json({ error: e instanceof Error ? e.message : String(e) }, { status });
export const userOf = (req: NextRequest) => {
  const u = req.headers.get("x-pcb-user");
  try { return u ? decodeURIComponent(u).slice(0, 80) : null; } catch { return null; }
};
