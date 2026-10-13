import type { ItemLedger, LedgerEntry, PurchaseOrder } from "./types";

/* ---------- Formatting ---------- */
export const num = (n: number) => Math.round(n).toLocaleString("en-US");
export const pkr = (n: number) => `PKR ${num(n)}`;
export const mil = (n: number, d = 1) => `${(n / 1e6).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}M`;

/* ---------- Dates (records use "08-Jul-2026") ---------- */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const parseD = (s: string) => {
  const [d, m, y] = s.split(" ")[0].split("-");
  return new Date(+y, MONTHS.indexOf(m), +d);
};
export const fmtD = (dt: Date) => `${String(dt.getDate()).padStart(2, "0")}-${MONTHS[dt.getMonth()]}-${dt.getFullYear()}`;
export const shortD = (s: string) => s.slice(0, 6).replace("-", " ");
export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);
/* Business date follows Pakistan Standard Time, never earlier than the seed's reference date */
const pkt = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month - 1, d: +p.day, hh: p.hour, mm: p.minute };
};
const SEED_DATE = new Date(2026, 9, 13);
const nowPkt = pkt(new Date());
const realToday = new Date(nowPkt.y, nowPkt.m, nowPkt.d);
export const TODAY = realToday > SEED_DATE ? realToday : SEED_DATE;
export const TODAY_STR = fmtD(TODAY);
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const stamp = () => {
  const n = pkt(new Date());
  return `${TODAY_STR.slice(0, 6)} ${n.hh}:${n.mm}`;
};

/* ---------- Ledger & weighted average cost (FR-0.5, FR-2.3, FR-11.2) ---------- */
export interface LedgerRow extends LedgerEntry { balance: number; wac: number }
export interface LedgerResult {
  open: { qty: number; wac: number; value: number };
  close: { qty: number; wac: number; value: number };
  rows: LedgerRow[];
  receipts: number;
  issues: number;
  grnCount: number;
  last?: LedgerRow;
}

export function computeLedger(L: ItemLedger, from: Date, to: Date): LedgerResult {
  let qty = L.opening.qty;
  let wac = L.opening.unitCost;
  const apply = (e: LedgerEntry) => {
    if (e.type === "GRN" && qty + e.qty > 0) wac = (qty * wac + e.qty * (e.unitCost ?? wac)) / (qty + e.qty);
    qty += e.qty;
  };
  const sorted = [...L.entries].sort((a, b) => parseD(a.date).getTime() - parseD(b.date).getTime());
  sorted.filter((e) => parseD(e.date) < from).forEach(apply);
  const open = { qty, wac, value: qty * wac };
  const rows: LedgerRow[] = [];
  let receipts = 0, issues = 0, grnCount = 0;
  for (const e of sorted) {
    const d = parseD(e.date);
    if (d < from || d > to) continue;
    apply(e);
    if (e.qty > 0) receipts += e.qty; else issues += -e.qty;
    if (e.type === "GRN") grnCount++;
    rows.push({ ...e, balance: qty, wac });
  }
  const grns = rows.filter((r) => r.type === "GRN");
  return { open, rows, close: { qty, wac, value: qty * wac }, receipts, issues, grnCount, last: grns[grns.length - 1] };
}

export const FY_START = new Date(2026, 6, 1);
export const FAR_FUTURE = new Date(2100, 0, 1);

/* ---------- Approval bands (delegation of financial powers) ---------- */
export const bandFor = (v: number) => (v <= 100000 ? "B1" : v <= 3000000 ? "B2" : v <= 20000000 ? "B3" : v <= 50000000 ? "B4" : "B5");

/* ---------- Purchase orders ---------- */
export const poValue = (p: PurchaseOrder) => p.qty * p.unitPrice + (p.extras ?? []).reduce((a, x) => a + x.amount, 0);
export function poStatus(p: PurchaseOrder) {
  if (p.received >= p.qty) return "Fully received";
  if (parseD(p.due) < TODAY) return "Overdue";
  if (p.received > 0) return "Partially received";
  return p.status === "Issued" ? "Issued" : "In transit";
}

/* ---------- Periods for reports ---------- */
export type PeriodKey = "week" | "month" | "quarter" | "fytd" | "custom";
export function periodRange(p: PeriodKey, custom: { from: string; to: string }) {
  if (p === "week") { const f = addDays(TODAY, -6); return { from: f, to: TODAY, label: `Week to date, ${fmtD(f).slice(0, 6)} – ${TODAY_STR}`, months: [3] }; }
  if (p === "month") return { from: new Date(TODAY.getFullYear(), TODAY.getMonth(), 1), to: TODAY, label: `${TODAY.toLocaleString("en-GB", { month: "long" })} ${TODAY.getFullYear()} to date`, months: [3] };
  if (p === "quarter") return { from: new Date(2026, 6, 1), to: new Date(2026, 8, 30), label: "Q1 FY 2026-27 (Jul–Sep)", months: [0, 1, 2] };
  if (p === "custom") {
    const f = new Date(custom.from), t = new Date(custom.to);
    const months = [0, 1, 2, 3].filter((i) => new Date(2026, 7 + i, 0) >= f && new Date(2026, 6 + i, 1) <= t);
    return { from: f, to: t, label: `${fmtD(f)} to ${fmtD(t)}`, months: months.length ? months : [3] };
  }
  return { from: FY_START, to: TODAY, label: "FY 2026-27 to date", months: [0, 1, 2, 3] };
}
