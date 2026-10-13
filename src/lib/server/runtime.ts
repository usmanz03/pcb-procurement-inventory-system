import { produce, type Draft } from "immer";
import { createActions, permit, type ActionName, type Actions, type Data, type EngineState, type Result, type Workflow } from "@/lib/engine";
import type { RoleKey } from "@/lib/types";
import { db } from "./db";
import { appendAudit, bumpVersion, getVersion, loadState, migrate, persist, recentActivities, resetAll } from "./repo";

type State = Data & Workflow;
const g = globalThis as unknown as { __pcbReady?: Promise<void>; __pcbCache?: { version: number; state: State } };

async function ready() {
  if (!g.__pcbReady) g.__pcbReady = (async () => { const d = await db(); await migrate(d.query, d.exec); })().catch((e) => { g.__pcbReady = undefined; throw e; });
  return g.__pcbReady;
}

export async function snapshot(): Promise<{ version: number; state: State }> {
  await ready();
  const d = await db();
  const version = await getVersion(d.query);
  if (g.__pcbCache?.version === version) return g.__pcbCache;
  const state = await loadState(d.query);
  g.__pcbCache = { version, state };
  return g.__pcbCache;
}

export async function currentVersion() {
  await ready();
  return getVersion((await db()).query);
}

export const ROLES: RoleKey[] = ["director", "committee", "cfo", "storekeeper", "auditor"];

export async function runAction(name: ActionName, args: unknown[], ctx: { role: RoleKey; ip: string | null; clientId: string | null; user?: string | null }): Promise<{ result: Result; version: number; state: State }> {
  await ready();
  const d = await db();
  return d.tx(async (q) => {
    const version = await getVersion(q);
    const base: State = g.__pcbCache?.version === version ? g.__pcbCache.state : await loadState(q);
    // The signed-in person acts under their own name within their role
    const roles = ctx.user ? { ...base.roles, [ctx.role]: { ...base.roles[ctx.role], user: ctx.user, initials: initials(ctx.user) } } : base.roles;
    const start: EngineState = { ...base, roles, role: ctx.role };
    const denied = permit(start, name);
    if (denied) return { result: denied, version, state: base };

    let cur = start;
    const set = (recipe: (s: Draft<EngineState>) => void) => { cur = produce(cur, recipe); };
    const actions = createActions(set, () => cur) as Actions;
    const fn = actions[name] as (...a: unknown[]) => Result;
    const result = fn(...args);
    if (cur === start) return { result, version, state: base };

    const actor = start.roles[ctx.role].user;
    const changes = await persist(q, start, cur, actor);
    const seen = new Set(start.recentActivities.map((a) => a.id));
    const fresh = cur.recentActivities.filter((a) => !seen.has(a.id)).reverse();
    const rows = (fresh.length ? fresh : [{ title: `${name} recorded`, desc: result.message, badge: "System", details: result.message, time: "" }]).map((a, i) => ({
      actor, role: ctx.role, ip: ctx.ip, clientId: ctx.clientId, action: name, title: a.title, description: a.desc, badge: a.badge, details: a.details, displayTime: a.time, changes: i === 0 ? changes : null,
    }));
    await appendAudit(q, rows);
    const nextVersion = await bumpVersion(q);
    const { role: _r, ...rest } = cur;
    void _r;
    const state: State = { ...rest, roles: base.roles, recentActivities: await recentActivities(q) };
    g.__pcbCache = { version: nextVersion, state };
    return { result, version: nextVersion, state };
  });
}

export async function resetDemo() {
  await ready();
  const d = await db();
  await d.tx(async (q) => { await resetAll(q); });
  g.__pcbCache = undefined;
  return snapshot();
}

export const initials = (name: string) => name.replace(/^(Engr|Dr|Mr|Ms|Mrs)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
