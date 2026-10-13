/*
 * Persistence for the engine state.
 * - One table per entity (id, position, JSONB document) so configuration stays data, not code.
 * - stock_ledger and audit_log are typed, append-only tables guarded by triggers.
 * - Every audit row carries before/after values and a SHA-256 hash chained to the previous row.
 */
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { fmtD, parseD } from "@/lib/domain";
import { initialData, initialWorkflow, WORKFLOW_KEYS, type Data, type EngineState, type Workflow } from "@/lib/engine";
import type { Activity, ItemLedger, LedgerEntry } from "@/lib/types";
import type { Q } from "./db";

/* eslint-disable @typescript-eslint/no-explicit-any */

/* ---------- Mapping between state collections and tables ---------- */
type ArrayKey = { [K in keyof Data]: Data[K] extends unknown[] ? K : never }[keyof Data];
export const ARRAYS: Partial<Record<ArrayKey, { table: string; key: string | null; label: string }>> = {
  stadiumStores: { table: "stores", key: "id", label: "Stores & sub-stores" },
  itemsMaster: { table: "items", key: "code", label: "Item master" },
  vendors: { table: "vendors", key: "id", label: "Vendor master" },
  budgetHeads: { table: "budget_heads", key: "id", label: "Budget heads (CapEx / OpEx)" },
  demands: { table: "demands", key: "id", label: "Demands / indents" },
  tenders: { table: "tenders", key: "id", label: "Tenders" },
  approvals: { table: "approvals", key: "id", label: "Approval requests" },
  intentions: { table: "award_intentions", key: "tender", label: "Intentions to award" },
  grievances: { table: "grievances", key: "id", label: "Grievance register" },
  purchaseOrders: { table: "purchase_orders", key: "po", label: "Purchase orders" },
  grns: { table: "goods_receipts", key: "grn", label: "Goods receipt notes" },
  invoices: { table: "invoices", key: "grn", label: "Vendor invoices" },
  custodyHolders: { table: "custody_holders", key: "empId", label: "Custody holders" },
  departmentCustodians: { table: "department_custodians", key: "dept", label: "Departmental custodians" },
  disposals: { table: "disposals", key: "id", label: "Condemnation & disposal register" },
  stockTakes: { table: "stock_takes", key: "id", label: "Stock-takes & count sheets" },
  guarantees: { table: "guarantees", key: "instrument", label: "Bid securities & guarantees" },
  sbdTemplates: { table: "bidding_documents", key: "name", label: "Standard bidding documents" },
  sbdComments: { table: "committee_remarks", key: null, label: "Committee remarks" },
  methodThresholds: { table: "procurement_thresholds", key: null, label: "PPRA method thresholds" },
  approvalMatrix: { table: "approval_matrix", key: "band", label: "Approval matrix (DFP)" },
  deadStock: { table: "dead_stock", key: null, label: "Dead-stock register" },
  tenderHistory: { table: "tender_history", key: "ref", label: "Tender history" },
};
export const MAPS = { custodyMeta: { table: "custody_status", label: "Custody status by asset tag" }, assetAttributes: { table: "asset_attributes", label: "Asset attributes" }, bidTerms: { table: "bid_terms", label: "Bid commercial terms" } } as const;
const CONFIG_KEYS = ["meta", "analytics", "roles", "delegation", "rfq", "reconciliationRecord", "ackEscalationHours", "spendByDept", "spendByCategory"] as const;
const LEDGER_TYPES = ["OPEN", "GRN", "ISSUE", "TRANSFER_OUT", "TRANSFER_IN", "RETURN", "ADJUST"];

const entityDdl = (t: string) => `create table if not exists ${t} (id text primary key, pos int not null, doc jsonb not null, updated_at timestamptz not null default now(), updated_by text);`;

export const SCHEMA = `
create table if not exists meta (key text primary key, value jsonb not null);
${Object.values(ARRAYS).map((a) => entityDdl(a!.table)).join("\n")}
${Object.values(MAPS).map((m) => entityDdl(m.table)).join("\n")}
create table if not exists configuration (key text primary key, value jsonb not null, updated_at timestamptz not null default now(), updated_by text);
create table if not exists workflow_state (key text primary key, value jsonb not null, updated_at timestamptz not null default now(), updated_by text);
create table if not exists item_opening (item_code text primary key, opened_on date not null, qty numeric not null, unit_cost numeric not null);
create table if not exists stock_ledger (
  id bigserial primary key, item_code text not null, posted_on date not null,
  type text not null check (type in (${LEDGER_TYPES.map((t) => `'${t}'`).join(",")})),
  ref text not null, doc text, qty numeric not null, unit_cost numeric, party text, custodian text, recipient text, purpose text, returnable boolean,
  created_at timestamptz not null default now(), created_by text);
create index if not exists stock_ledger_item_idx on stock_ledger (item_code, id);
create table if not exists audit_log (
  id bigserial primary key, at timestamptz not null, actor text not null, role text not null, ip text, client_id text, action text,
  title text not null, description text, badge text, details text, display_time text, changes jsonb,
  prev_hash text not null, hash text not null unique);
create index if not exists audit_log_at_idx on audit_log (at desc);
create table if not exists app_users (
  id serial primary key, email text not null unique, name text not null, role text not null, department text,
  password_hash text not null, created_at timestamptz not null default now(), last_login timestamptz);
create or replace function pcb_append_only() returns trigger language plpgsql as $$
begin raise exception '% on % is not permitted: the table is append-only', tg_op, tg_table_name; end $$;
drop trigger if exists audit_log_append_only on audit_log;
create trigger audit_log_append_only before update or delete on audit_log for each row execute function pcb_append_only();
drop trigger if exists stock_ledger_append_only on stock_ledger;
create trigger stock_ledger_append_only before update or delete on stock_ledger for each row execute function pcb_append_only();
`;

export const ALL_TABLES = ["app_users", "meta", ...Object.values(ARRAYS).map((a) => a!.table), ...Object.values(MAPS).map((m) => m.table), "configuration", "workflow_state", "item_opening", "stock_ledger", "audit_log"];

/* ---------- Helpers ---------- */
export const GENESIS = "0".repeat(64);
export function stable(v: any): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  return `{${Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(",")}}`;
}
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const auditHash = (prev: string, r: { at: string; actor: string; role: string; action: string | null; title: string; description: string | null; badge: string | null; details: string | null; changes: any }) =>
  sha256(`${prev}|${stable({ at: r.at, actor: r.actor, role: r.role, action: r.action, title: r.title, description: r.description, badge: r.badge, details: r.details, changes: r.changes ?? null })}`);
const isoDate = (d: string) => { const x = parseD(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const fromIso = (v: any) => { const d = v instanceof Date ? v : new Date(`${String(v).slice(0, 10)}T00:00:00`); return fmtD(new Date(d.getFullYear(), d.getMonth(), d.getDate())); };
const pgDate = (v: any) => (v instanceof Date ? fmtD(new Date(v.getUTCFullYear(), v.getUTCMonth(), v.getUTCDate())) : fromIso(v));

const rowsOf = (arr: any[], key: string | null) => arr.map((r, i) => ({ id: key ? String(r[key]) : String(i), pos: i, doc: r }));

/* ---------- Seed ---------- */
export async function migrate(q: Q, exec: (s: string) => Promise<void>) {
  await exec(SCHEMA);
  const v = await q<{ value: number }>("select value from meta where key = 'version'");
  if (!v.length) await seed(q);
  const roles = initialData().roles;
  if (!(await q(`select 1 from app_users limit 1`)).length)
    for (const u of SEED_USERS) await q(`insert into app_users (email, name, role, department, password_hash) values ($1,$2,$3,$4,$5) on conflict (email) do nothing`, [u.email, roles[u.role].user, u.role, u.department, hashPassword(DEMO_PASSWORD)]);
}

export async function seed(q: Q) {
  const d = initialData();
  const w = initialWorkflow();
  for (const [k, m] of Object.entries(ARRAYS)) for (const r of rowsOf((d as any)[k], m!.key)) await q(`insert into ${m!.table} (id, pos, doc, updated_by) values ($1,$2,$3,'Data migration')`, [r.id, r.pos, JSON.stringify(r.doc)]);
  for (const [k, m] of Object.entries(MAPS)) { let i = 0; for (const [id, doc] of Object.entries((d as any)[k])) await q(`insert into ${m.table} (id, pos, doc, updated_by) values ($1,$2,$3,'Data migration')`, [id, i++, JSON.stringify(doc)]); }
  for (const k of CONFIG_KEYS) await q(`insert into configuration (key, value, updated_by) values ($1,$2,'Data migration')`, [k, JSON.stringify((d as any)[k])]);
  for (const k of WORKFLOW_KEYS) await q(`insert into workflow_state (key, value, updated_by) values ($1,$2,'Data migration')`, [k, JSON.stringify(w[k])]);
  for (const [code, L] of Object.entries(d.itemLedgers)) {
    await q(`insert into item_opening (item_code, opened_on, qty, unit_cost) values ($1,$2,$3,$4)`, [code, isoDate(L.opening.date), L.opening.qty, L.opening.unitCost]);
    const sorted = [...L.entries].sort((a, b) => parseD(a.date).getTime() - parseD(b.date).getTime());
    for (const e of sorted) await insertLedger(q, code, e, "Data migration");
  }
  await seedAudit(q, d);
  await q(`insert into meta (key, value) values ('version', '1'), ('seeded_at', $1)`, [JSON.stringify(new Date().toISOString())]);
}

async function insertLedger(q: Q, code: string, e: LedgerEntry & { returnable?: boolean }, by: string) {
  await q(`insert into stock_ledger (item_code, posted_on, type, ref, doc, qty, unit_cost, party, custodian, recipient, purpose, returnable, created_by) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [code, isoDate(e.date), e.type, e.ref, e.doc ?? null, e.qty, e.unitCost ?? null, e.party ?? null, e.custodian ?? null, e.recipient ?? null, e.purpose ?? null, e.returnable ?? null, by]);
}

/* Historic audit trail reconstructed from migrated records, so the chain starts at go-live */
async function seedAudit(q: Q, d: Data) {
  type Ev = { at: Date; actor: string; role: string; title: string; desc: string; badge: string };
  const ev: Ev[] = [];
  const at = (date: string, h: number, m = 0) => { const x = parseD(date); x.setHours(h, m); return x; };
  d.purchaseOrders.forEach((p, i) => ev.push({ at: at(p.date, 11, 10 + i), actor: "Usman Zafar", role: "director", title: "Purchase order released", desc: `${p.po} to ${p.vendor} for ${p.qty} × ${p.item}.`, badge: "Purchase Order" }));
  d.grns.forEach((g, i) => ev.push({ at: at(g.date, 14, 5 + i), actor: "Muhammad Rashid", role: "storekeeper", title: "Goods received", desc: `${g.grn} against ${g.po}: ${g.accepted} accepted${g.rejected ? `, ${g.rejected} rejected` : ""}.`, badge: "Goods Receipt" }));
  d.demands.forEach((x, i) => ev.push({ at: at(x.date, 9, 20 + i), actor: x.by, role: "storekeeper", title: "Demand raised", desc: `${x.id}: ${x.qty} × ${x.itemCode} for ${x.dept}.`, badge: "Auto Branching" }));
  d.approvals.forEach((a) => a.chain.filter((c) => c.status === "approved" && c.at).forEach((c, i) => {
    const [dd, tt] = (c.at as string).split(" ");
    const date = /^\d{2}-[A-Za-z]{3}$/.test(dd) ? `${dd}-2026` : dd;
    try { const x = parseD(date); if (!isNaN(x.getTime())) { const [h, m] = (tt ?? "10:00").split(":").map(Number); x.setHours(h || 10, m || i); ev.push({ at: x, actor: c.name, role: c.roleKey ?? "committee", title: `${a.type} approved`, desc: `${a.ref}: ${c.role} approved.`, badge: "Approval Workflow" }); } } catch { /* skip */ }
  }));
  d.invoices.filter((i) => i.status === "Paid").forEach((i) => ev.push({ at: at(i.received, 16), actor: "Tariq Mehmood", role: "cfo", title: "Payment released", desc: `${i.inv}: paid to ${i.vendor} (${i.paidRef}).`, badge: "Finance Gate" }));
  ev.push({ at: new Date(2026, 6, 1, 8), actor: "System", role: "system", title: "Data migration reconciled", desc: "Item master, opening stock, vendor master, open POs and custody records migrated and signed off.", badge: "Data Migration" });
  ev.sort((a, b) => a.at.getTime() - b.at.getTime());
  let prev = GENESIS;
  for (const e of ev) {
    const iso = e.at.toISOString();
    const row = { at: iso, actor: e.actor, role: e.role, action: "migration", title: e.title, description: e.desc, badge: e.badge, details: e.desc, changes: null };
    const hash = auditHash(prev, row);
    const disp = `${fmtD(e.at).slice(0, 6)} ${String(e.at.getHours()).padStart(2, "0")}:${String(e.at.getMinutes()).padStart(2, "0")}`;
    await q(`insert into audit_log (at, actor, role, ip, client_id, action, title, description, badge, details, display_time, changes, prev_hash, hash) values ($1,$2,$3,'10.20.1.15',null,$4,$5,$6,$7,$8,$9,null,$10,$11)`,
      [iso, row.actor, row.role, row.action, row.title, row.description, row.badge, row.details, disp, prev, hash]);
    prev = hash;
  }
}

/* ---------- Load ---------- */
export async function loadState(q: Q): Promise<Data & Workflow> {
  const out: any = {};
  for (const [k, m] of Object.entries(ARRAYS)) out[k] = (await q(`select doc from ${m!.table} order by pos`)).map((r: any) => r.doc);
  for (const [k, m] of Object.entries(MAPS)) out[k] = Object.fromEntries((await q(`select id, doc from ${m.table} order by pos`)).map((r: any) => [r.id, r.doc]));
  for (const r of await q(`select key, value from configuration`)) out[r.key] = r.value;
  for (const r of await q(`select key, value from workflow_state`)) out[r.key] = r.value;
  const ledgers: Record<string, ItemLedger> = {};
  for (const r of await q(`select item_code, opened_on, qty, unit_cost from item_opening`)) ledgers[r.item_code] = { opening: { date: pgDate(r.opened_on), qty: Number(r.qty), unitCost: Number(r.unit_cost) }, entries: [] };
  for (const r of await q(`select * from stock_ledger order by id`)) {
    const e: any = { date: pgDate(r.posted_on), type: r.type, ref: r.ref, doc: r.doc ?? "", qty: Number(r.qty), party: r.party ?? "", purpose: r.purpose ?? "" };
    if (r.unit_cost !== null) e.unitCost = Number(r.unit_cost);
    if (r.custodian) e.custodian = r.custodian;
    if (r.recipient) e.recipient = r.recipient;
    if (r.returnable !== null) e.returnable = r.returnable;
    (ledgers[r.item_code] ??= { opening: { date: "01-Jul-2026", qty: 0, unitCost: 0 }, entries: [] }).entries.push(e);
  }
  out.itemLedgers = ledgers;
  out.recentActivities = await recentActivities(q);
  return out;
}

export async function recentActivities(q: Q, limit = 60): Promise<Activity[]> {
  return (await q(`select id, actor, title, description, badge, details, display_time from audit_log order by id desc limit $1`, [limit])).map((r: any) => ({
    id: `AUD-${r.id}`, title: r.title, desc: r.description ?? "", time: r.display_time ?? "", badge: r.badge ?? "", details: r.details ?? r.description ?? "", user: r.actor,
  }));
}

/* ---------- Persist the difference between two states ---------- */
export interface Change { table: string; id: string; op: "insert" | "update" | "delete"; before?: any; after?: any }

export async function persist(q: Q, a: EngineState, b: EngineState, actor: string): Promise<Change[]> {
  const changes: Change[] = [];
  for (const [k, m] of Object.entries(ARRAYS)) {
    const before = (a as any)[k] as any[], after = (b as any)[k] as any[];
    if (before === after) continue;
    const prev = new Map(rowsOf(before, m!.key).map((r) => [r.id, r]));
    const next = rowsOf(after, m!.key);
    for (const r of next) {
      const p = prev.get(r.id);
      if (p && p.doc === r.doc && p.pos === r.pos) continue;
      await q(`insert into ${m!.table} (id, pos, doc, updated_at, updated_by) values ($1,$2,$3,now(),$4) on conflict (id) do update set pos = excluded.pos, doc = excluded.doc, updated_at = now(), updated_by = excluded.updated_by`, [r.id, r.pos, JSON.stringify(r.doc), actor]);
      if (!p) changes.push({ table: m!.table, id: r.id, op: "insert", after: r.doc });
      else if (p.doc !== r.doc && (m!.key || stable(p.doc) !== stable(r.doc))) changes.push({ table: m!.table, id: r.id, op: "update", before: p.doc, after: r.doc });
    }
    const ids = new Set(next.map((r) => r.id));
    for (const [id, p] of prev) if (!ids.has(id)) { await q(`delete from ${m!.table} where id = $1`, [id]); changes.push({ table: m!.table, id, op: "delete", before: p.doc }); }
  }
  for (const [k, m] of Object.entries(MAPS)) {
    const before = (a as any)[k] as Record<string, any>, after = (b as any)[k] as Record<string, any>;
    if (before === after) continue;
    const keys = Object.keys(after);
    for (const [i, id] of keys.entries()) {
      if (before[id] === after[id]) continue;
      await q(`insert into ${m.table} (id, pos, doc, updated_at, updated_by) values ($1,$2,$3,now(),$4) on conflict (id) do update set doc = excluded.doc, updated_at = now(), updated_by = excluded.updated_by`, [id, i, JSON.stringify(after[id]), actor]);
      changes.push({ table: m.table, id, op: before[id] ? "update" : "insert", before: before[id], after: after[id] });
    }
  }
  for (const k of CONFIG_KEYS) if ((a as any)[k] !== (b as any)[k]) {
    await q(`update configuration set value = $2, updated_at = now(), updated_by = $3 where key = $1`, [k, JSON.stringify((b as any)[k]), actor]);
    changes.push({ table: "configuration", id: k, op: "update", before: (a as any)[k], after: (b as any)[k] });
  }
  for (const k of WORKFLOW_KEYS) if (a[k] !== b[k]) {
    await q(`insert into workflow_state (key, value, updated_by) values ($1,$2,$3) on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`, [k, JSON.stringify(b[k]), actor]);
    if (k !== "seq" && k !== "tagSeq") changes.push({ table: "workflow_state", id: k, op: "update", before: a[k], after: b[k] });
  }
  if (a.itemLedgers !== b.itemLedgers) {
    for (const [code, L] of Object.entries(b.itemLedgers)) {
      const P = a.itemLedgers[code];
      if (P === L) continue;
      if (!P) await q(`insert into item_opening (item_code, opened_on, qty, unit_cost) values ($1,$2,$3,$4) on conflict do nothing`, [code, isoDate(L.opening.date), L.opening.qty, L.opening.unitCost]);
      const from = P ? P.entries.length : 0;
      if (P && P.entries.some((e, i) => L.entries[i] !== e)) throw new Error(`Ledger for ${code} can only be appended to`);
      for (const e of L.entries.slice(from)) { await insertLedger(q, code, e, actor); changes.push({ table: "stock_ledger", id: `${code}/${e.ref}`, op: "insert", after: e }); }
    }
  }
  return changes;
}

/* ---------- Audit ---------- */
export async function appendAudit(q: Q, rows: { actor: string; role: string; ip: string | null; clientId: string | null; action: string; title: string; description: string; badge: string; details: string; displayTime: string; changes: Change[] | null }[]) {
  let prev = (await q<{ hash: string }>(`select hash from audit_log order by id desc limit 1`))[0]?.hash ?? GENESIS;
  const base = Date.now();
  for (const [i, r] of rows.entries()) {
    const at = new Date(base + i).toISOString();
    const hash = auditHash(prev, { at, actor: r.actor, role: r.role, action: r.action, title: r.title, description: r.description, badge: r.badge, details: r.details, changes: r.changes });
    await q(`insert into audit_log (at, actor, role, ip, client_id, action, title, description, badge, details, display_time, changes, prev_hash, hash) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [at, r.actor, r.role, r.ip, r.clientId, r.action, r.title, r.description, r.badge, r.details, r.displayTime, r.changes ? JSON.stringify(r.changes) : null, prev, hash]);
    prev = hash;
  }
}

export async function verifyAudit(q: Q) {
  const t0 = performance.now();
  const rows = await q(`select id, at, actor, role, action, title, description, badge, details, changes, prev_hash, hash from audit_log order by id`);
  let prev = GENESIS;
  for (const r of rows) {
    const at = (r.at instanceof Date ? r.at : new Date(r.at)).toISOString();
    const expect = auditHash(prev, { at, actor: r.actor, role: r.role, action: r.action, title: r.title, description: r.description, badge: r.badge, details: r.details, changes: r.changes });
    if (r.prev_hash !== prev || r.hash !== expect) return { ok: false, count: rows.length, brokenAt: Number(r.id), head: prev, ms: performance.now() - t0 };
    prev = r.hash;
  }
  return { ok: true, count: rows.length, head: prev, ms: performance.now() - t0 };
}

export async function getVersion(q: Q): Promise<number> {
  return Number((await q(`select value from meta where key = 'version'`))[0]?.value ?? 0);
}

export async function bumpVersion(q: Q): Promise<number> {
  const r = await q(`update meta set value = to_jsonb((value)::text::bigint + 1) where key = 'version' returning value`);
  return Number(r[0].value);
}

export async function resetAll(q: Q) {
  // TRUNCATE is the only way to clear append-only tables; it is reserved for the demo reset
  // Accounts survive a demo reset
  await q(`truncate ${ALL_TABLES.filter((t) => t !== "app_users").join(", ")} restart identity`);
  await seed(q);
}

/* ---------- Accounts ---------- */
export const DEMO_PASSWORD = "Pcb@2026";
export const SEED_USERS = [
  { role: "director", email: "usman.zafar@pcb.com.pk", department: "Procurement Wing" },
  { role: "committee", email: "farhan.ali@pcb.com.pk", department: "Procurement Committee" },
  { role: "cfo", email: "tariq.mehmood@pcb.com.pk", department: "Finance" },
  { role: "storekeeper", email: "muhammad.rashid@pcb.com.pk", department: "Stores & Custody Wing" },
  { role: "auditor", email: "audit@agp.gov.pk", department: "Auditor-General of Pakistan" },
] as const;
export function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(pw, salt, 32).toString("hex")}`;
}
export function checkPassword(pw: string, stored: string) {
  const [, salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const a = scryptSync(pw, Buffer.from(salt, "hex"), 32), b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
