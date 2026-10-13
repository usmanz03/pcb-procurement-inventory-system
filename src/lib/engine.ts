/*
 * Business rules for every module. The same code runs authoritatively on the server
 * (inside a Postgres transaction, see src/lib/server/engine-runner.ts) and optimistically
 * in the browser, so the UI responds instantly while the database stays the system of record.
 */
import type { Draft } from "immer";
import seedJson from "./seed.json";
import { addDays, bandFor, computeLedger, FAR_FUTURE, fmtD, parseD, pkr, poValue, stamp, TODAY, TODAY_STR } from "./domain";
import type {
  Activity, Approval, BudgetHead, CustodyHolder, CustodyMeta, Demand, Disposal, Grievance, Grn, Guarantee, Intention, Invoice,
  Item, ItemLedger, Lifecycle, PurchaseOrder, Quote, Role, RoleKey, StockTake, Store, Tender, Vendor,
} from "./types";
import { createStoreActions, STORE_ACTION_TAB, type StoreActions } from "./engine-stores";

/* eslint-disable @typescript-eslint/no-explicit-any */
const seed = seedJson as any;

export interface Data {
  meta: any;
  stadiumStores: Store[];
  itemsMaster: Item[];
  tenders: Tender[];
  custodyHolders: CustodyHolder[];
  recentActivities: Activity[];
  analytics: any;
  roles: Record<RoleKey, Role>;
  budgetHeads: BudgetHead[];
  methodThresholds: { max: number | null; method: string; docs: string; advert: string; minDays: number }[];
  approvalMatrix: { band: string; range: string; chain: string[] }[];
  delegation: { active: boolean; from: string; to: string; period: string; reason: string };
  approvals: Approval[];
  intentions: Intention[];
  grievances: Grievance[];
  demands: Demand[];
  itemLedgers: Record<string, ItemLedger>;
  assetAttributes: Record<string, { warranty: string; usefulLife: string; depreciation: string }>;
  stockTakes: StockTake[];
  deadStock: { code: string; name: string; store: string; qty: number; value: number; lastMovement: string; days: number }[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  grns: Grn[];
  invoices: Invoice[];
  sbdTemplates: { name: string; version: string; updated: string; status: string }[];
  sbdComments: { by: string; role: string; at: string; text: string }[];
  rfq: { id: string; title: string; estValue: number; itemCode: string; closes: string; vendorIds: string[]; quoteBook: Quote[] };
  bidTerms: Record<string, { delivery: string; warranty: string; payment: string }>;
  guarantees: Guarantee[];
  departmentCustodians: { dept: string; custodian: string; holders: number; items: number }[];
  custodyMeta: Record<string, CustodyMeta>;
  ackEscalationHours: number;
  spendByDept: { name: string; value: number }[];
  spendByCategory: { name: string; value: number }[];
  tenderHistory: { ref: string; title: string; method: string; value: number; bidders: number; stage: string; days: number }[];
  reconciliationRecord: any;
  disposals: Disposal[];
}

/* Workflow state shared by all users, persisted alongside the data */
export interface Workflow {
  t089: { ita: boolean; closed: boolean; po: boolean };
  vaultOpen: boolean;
  rfqState: { dispatched: boolean; selected: string[]; quotes: Quote[]; po?: string };
  sbdLocked: boolean;
  scheduled: { name: string; freq: string; to: string; fmt: string; next: string }[];
  seq: { grn: number; apr: number; demand: number; sin: number; pr: number; trf: number; po: number; dsp: number; vnd: number; stk: number };
  tagSeq: Record<string, number>;
}

export type EngineState = Data & Workflow & { role: RoleKey };
export type Result = { ok: boolean; title: string; message: string; detail?: any };

export interface Actions extends StoreActions {
  decideApproval: (id: string, action: "approve" | "reject" | "return", remark: string, demo?: boolean) => Result;
  rerouteApproval: (id: string) => Result;
  closeStandstill: (tender: string) => Result;
  addGrievance: (g: { tender: string; subject: string; complainant: string; ground: string }) => Result;
  decideGrievance: (id: string, status: string) => Result;
  endDelegation: () => Result;
  issuePO089: () => Result;
  postGRN: (po: string, g: { qty: number; rejected: number; inspector: string; remark: string }) => Result;
  captureInvoice: (grn: string, v: { inv: string; qty: number; rate: number }) => Result;
  resolveException: (inv: string, how: "cap" | "credit") => Result;
  releasePayment: (inv: string) => Result;
  transferStock: (t: { code: string; from: string; to: string; qty: number; reason: string }) => Result;
  issueAsset: (v: { itemCode: string; empId: string; purpose: string; location: string; expectedReturn: string }) => Result;
  confirmCustody: (tag: string) => Result;
  remindCustody: (tag: string) => Result;
  setLifecycle: (tag: string, s: Lifecycle) => Result;
  handOver: (h: { tag: string; toEmpId: string; purpose: string; expectedReturn: string }) => Result;
  proposeDisposal: (v: { tag: string; reason: string; method: "Write-off" | "Auction"; reservePrice?: number }) => Result;
  registerVendor: (v: { name: string; ntn: string; strn: string; category: string; email: string; phone: string; address: string; financial: number; technical: number; past: number; turnover: number }) => Result;
  proposeBlacklist: (vendorId: string, reason: string, period: string) => Result;
  openEnvelopes: () => Result;
  toggleRfqVendor: (id: string, on: boolean) => Result;
  dispatchRfq: () => Result;
  receiveQuote: () => Result;
  approveRfqCst: () => Result;
  addSbdComment: (text: string) => Result;
  lockSbd: () => Result;
  releaseGuarantee: (i: number) => Result;
  scheduleReport: (s: { name: string; freq: string; to: string; fmt: string }) => Result;
}
export type ActionName = keyof Actions;

/* Module each action belongs to, for role-based access control (NFR-2) */
export const ACTION_TAB: Record<ActionName, string> = {
  decideApproval: "approvals", rerouteApproval: "approvals", closeStandstill: "approvals", addGrievance: "approvals", decideGrievance: "approvals", endDelegation: "approvals",
  issuePO089: "orders", postGRN: "orders",
  captureInvoice: "finance", resolveException: "finance", releasePayment: "finance",
  ...STORE_ACTION_TAB, transferStock: "inventory",
  issueAsset: "custody", confirmCustody: "custody", remindCustody: "custody", setLifecycle: "custody", handOver: "custody", proposeDisposal: "custody",
  registerVendor: "items", proposeBlacklist: "items",
  openEnvelopes: "tenders", toggleRfqVendor: "tenders", dispatchRfq: "tenders", receiveQuote: "tenders", approveRfqCst: "tenders", addSbdComment: "tenders", lockSbd: "tenders", releaseGuarantee: "tenders",
  scheduleReport: "reports",
};

export const canAccess = (role: Role, tab: string) => role.tabs === "all" || ["trace", "system", "commitment"].includes(tab) || role.tabs.includes(({ sourcing: "tenders", catalogue: "items", demands: "inventory" } as Record<string, string>)[tab] ?? tab);

export function permit(st: Pick<EngineState, "roles" | "role">, name: ActionName): Result | null {
  const role = st.roles[st.role];
  if (role.readOnly) return { ok: false, title: "Read-only access", message: `${role.label} can view every record but cannot change any.` };
  if (!canAccess(role, ACTION_TAB[name])) return { ok: false, title: "Not permitted for your role", message: `${role.label} has no access to this function.` };
  return null;
}

export function initialData(): Data {
  const d: Data = JSON.parse(JSON.stringify(seed));
  d.disposals = d.disposals ?? [];
  d.itemsMaster.forEach((i) => { i.status = i.status ?? "Active"; i.reserved = i.reserved ?? 0; i.legacyCodes = i.legacyCodes ?? []; });
  d.itemsMaster.forEach((i) => {
    const L = d.itemLedgers[i.code];
    if (L) i.avgCostPkr = Math.round(computeLedger(L, new Date(2000, 0, 1), FAR_FUTURE).close.wac);
  });
  d.recentActivities.forEach((a) => (a.user = a.user ?? "System"));
  return d;
}

export function initialWorkflow(): Workflow {
  return {
    t089: { ita: false, closed: false, po: false },
    vaultOpen: true,
    rfqState: { dispatched: false, selected: ["VND-0203", "VND-0218", "VND-0227"], quotes: [] },
    sbdLocked: false,
    scheduled: [
      { name: "Item ledger, all items", freq: "Monthly", to: "cfo@pcb.com.pk", fmt: "PDF + Excel", next: "01-Nov-2026 07:00" },
      { name: "Vendor performance", freq: "Quarterly", to: "director.procurement@pcb.com.pk", fmt: "PDF", next: "01-Jan-2027 07:00" },
    ],
    seq: { grn: 504, apr: 190, demand: 1052, sin: 8903, pr: 4408, trf: 48, po: 332, dsp: 8, vnd: 501, stk: 15 },
    tagSeq: { LGT: 21, MOW: 7, HWK: 13, REC: 15, ROL: 1 },
  };
}

export const WORKFLOW_KEYS: (keyof Workflow)[] = ["t089", "vaultOpen", "rfqState", "sbdLocked", "scheduled", "seq", "tagSeq"];

const ok = (title: string, message: string, detail?: any): Result => ({ ok: true, title, message, detail });
const no = (title: string, message: string): Result => ({ ok: false, title, message });
const T089 = "PCB/LOG-PSL10/2026/089";
const tagFor = (sub: string, n: number) => `PCB-AST-${sub}-${String(n).padStart(4, "0")}`;

type Set = (recipe: (s: Draft<EngineState>) => void) => void;
type Get = () => EngineState;

export function createActions(set: Set, get: Get): Actions {
  const user = () => get().roles[get().role].user;
  const log = (title: string, desc: string, badge: string, details?: string) =>
    set((s) => {
      s.recentActivities.unshift({ id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, desc, time: stamp(), badge, details: details ?? desc, user: s.roles[s.role].user });
      if (s.recentActivities.length > 60) s.recentActivities.pop();
    });
  const nextApr = () => { const id = `APR-2026-0${get().seq.apr}`; set((s) => { s.seq.apr++; }); return id; };
  const { _approved, _rejected, ...storeActions } = createStoreActions(set, get, log, nextApr);

  /* Side effects when an approval chain completes */
  const onApprovalComplete = (id: string) => {
    const a = get().approvals.find((x) => x.id === id)!;
    set((s) => {
      if (id === "APR-2026-0186") {
        s.t089.ita = true;
        s.tenders[0].currentStage = "Intention to Award (standstill)";
        s.intentions.unshift({ tender: T089, title: "LED floodlights, Gaddafi Stadium", bidder: "Signify Pakistan Ltd", published: TODAY_STR, expires: `${fmtD(addDays(TODAY, 10))} 17:00`, days: 10, elapsed: 0 });
      }
      if (a.type === "Vendor Blacklisting") {
        const v = s.vendors.find((x) => x.id === a.ref);
        if (v) { v.status = "Blacklisted"; v.until = fmtD(addDays(TODAY, 730)); }
      }
      if (a.type === "Asset Disposal") {
        const d = s.disposals.find((x) => x.id === a.ref);
        if (d) {
          d.status = d.method === "Auction" ? "Approved for auction" : "Written off";
          d.decidedOn = TODAY_STR;
          if (s.custodyMeta[d.assetTag]) s.custodyMeta[d.assetTag].lifecycle = "Disposed";
        }
      }
    });
    if (id === "APR-2026-0186") log("Intention to Award published", "Tender 089: 10-day standstill started.", "PPRA Compliance", `Notice posted on PCB and PPRA websites. Standstill ends ${fmtD(addDays(TODAY, 10))} 17:00.`);
    if (a.type === "Vendor Blacklisting") log("Vendor blacklisted", `${a.ref} debarred and excluded from invitations.`, "Vendor Control");
    _approved(get().approvals.find((x) => x.id === id)!);
    if (a.type === "Asset Disposal") {
      const d = get().disposals.find((x) => x.id === a.ref);
      if (d) log(d.method === "Auction" ? "Disposal approved for auction" : "Asset written off", `${d.id}: ${d.assetTag} removed from the active asset register.`, "Disposal Register", `${d.reason}. History retained for audit.`);
    }
  };

  return {
    ...storeActions,
    decideApproval: (id, action, remark, demo = false) => {
      const st = get();
      const a = st.approvals.find((x) => x.id === id);
      const step = a?.chain.find((c) => c.status === "pending");
      if (!a || !step) return no("Nothing to decide", "This request has no pending step.");
      if ((action === "reject" || action === "return") && !remark.trim()) return no("Remark required", "Add a remark before rejecting or returning.");
      if (a.requestedBy === user()) return no("Segregation of duties", "You raised this request, so you cannot decide on it.");
      if (demo ? !!step.roleKey : step.roleKey !== st.role) return no("Not your step", `This step waits for ${step.role}.`);
      let next: string | undefined;
      let final = false;
      set((s) => {
        const ap = s.approvals.find((x) => x.id === id)!;
        const sp = ap.chain.find((c) => c.status === "pending")!;
        sp.at = stamp();
        if (!demo && sp.roleKey) sp.name = user();
        if (action === "approve") {
          sp.status = "approved";
          sp.remark = remark.trim() || (demo ? "Approved (recorded by Board Secretariat)." : "Approved.");
          const n = ap.chain.find((c) => c.status === "waiting");
          if (n) { n.status = "pending"; ap.elapsedHours = 0; next = n.role; } else { ap.status = "approved"; final = true; }
        } else {
          sp.status = action === "reject" ? "rejected" : "returned";
          sp.remark = remark.trim();
          ap.status = action === "reject" ? "rejected" : "returned";
          if (ap.type === "Asset Disposal") { const d = s.disposals.find((x) => x.id === ap.ref); if (d) d.status = "Rejected"; }
          if (ap.type === "Vendor Blacklisting") { const v = s.vendors.find((x) => x.id === ap.ref); if (v && v.status === "Blacklisting proposed") v.status = "Eligible"; }
        }
      });
      const verb = action === "approve" ? "approved" : action === "reject" ? "rejected" : "returned";
      log(`${a.type} ${verb}`, `${a.ref}: ${step.role} ${verb}${next ? `, routed to ${next}` : final ? " (final)" : ""}.`, "Approval Workflow", `${a.id}. Remark: ${remark || "—"}`);
      if (final) onApprovalComplete(a.id);
      if (action !== "approve") _rejected(get().approvals.find((x) => x.id === id)!);
      if (action === "approve") return ok(final ? "Final approval recorded" : "Approved and routed", final ? `${a.ref} is fully approved.` : `${a.ref} moved to ${next}.`);
      return ok(action === "reject" ? "Rejected" : "Returned for clarification", `${a.requestedBy} has been notified.`);
    },

    rerouteApproval: (id) => {
      const a0 = get().approvals.find((x) => x.id === id);
      if (!a0 || a0.status !== "pending") return no("Nothing to re-route", "This request is not pending.");
      set((s) => {
        const a = s.approvals.find((x) => x.id === id)!;
        const step = a.chain.find((c) => c.status === "pending")!;
        Object.assign(step, { role: "CFO (alternate approver)", name: "Tariq Mehmood", roleKey: "cfo" });
        if (!a.requestedBy.endsWith("(self-raised)")) a.requestedBy = `${a.requestedBy} (self-raised)`;
        a.sodBlocked = true;
      });
      log("Self-approval prevented", `${a0.ref} re-routed to CFO under segregation of duties.`, "Access Control");
      return ok("Routed to alternate approver", `${a0.ref} now waits for the CFO.`);
    },

    closeStandstill: (tender) => {
      set((s) => {
        const t = s.intentions.find((x) => x.tender === tender);
        if (t) t.elapsed = t.days;
        if (tender === T089) s.t089.closed = true;
      });
      log("Standstill window closed", `${tender}: grievance window ended.`, "PPRA Compliance");
      return ok("Standstill closed", `${tender}: PO release unlocked if no grievance is open.`);
    },

    addGrievance: (g) => {
      const open = get().intentions.find((t) => t.tender === g.tender && t.elapsed < t.days);
      if (!open) return no("Window closed", "Grievances are accepted only during the standstill window.");
      const id = `GRV-2026-${String(get().grievances.length + 6).padStart(3, "0")}`;
      set((s) => { s.grievances.unshift({ id, ...g, filed: TODAY_STR, committee: "Grievance Redressal Committee (3)", hearing: "To be scheduled", status: "Hearing to be scheduled" }); });
      log("Grievance registered", `${id} against ${g.tender}.`, "PPRA Compliance", `${g.complainant}: ${g.ground}`);
      return ok("Grievance registered", `${id} assigned to the redressal committee. PO release stays locked.`);
    },

    decideGrievance: (id, status) => {
      set((s) => { const g = s.grievances.find((x) => x.id === id)!; g.status = status; if (g.hearing === "To be scheduled") g.hearing = TODAY_STR; });
      log("Grievance decided", `${id}: ${status}.`, "PPRA Compliance");
      return ok("Decision recorded", `${id}: ${status}.`);
    },

    endDelegation: () => { set((s) => { s.delegation.active = false; }); log("Delegation ended", "COO → CFO delegation ended.", "Approval Workflow"); return ok("Delegation ended", "Approvals route to the COO again."); },

    issuePO089: () => {
      if (get().t089.po) return no("Already issued", "PO-PCB-2026-0331 has been released.");
      const failed = tenderGates(get()).filter((g) => !g.ok);
      if (failed.length) return no("PPRA checks not passed", failed.map((g) => g.label).join("; "));
      const p: PurchaseOrder = {
        po: "PO-PCB-2026-0331", date: TODAY_STR, vendor: "Signify Pakistan Ltd (Philips Lighting)", vendorId: "VND-0101", source: `Tender ${T089}`,
        itemCode: "PCB-INF-LGT-0018", item: "Philips ArenaVision LED luminaire 1500W", qty: 110, received: 0, unitPrice: 400000,
        extras: [{ desc: "Turnkey rigging, aiming and commissioning (lump sum)", amount: 4200000 }], taxRate: 0.18, budgetHead: "BH-CAP-INF",
        due: fmtD(addDays(TODAY, 99)), ld: "0.1% per day, max 10%", terms: "10% advance against bank guarantee, 90% on commissioning", status: "Issued",
      };
      const total = poValue(p) * 1.18;
      let before = 0, after = 0;
      set((s) => {
        s.purchaseOrders.unshift(p);
        const h = s.budgetHeads.find((b) => b.id === p.budgetHead)!;
        before = h.committed; h.committed += total; after = h.committed;
        s.t089.po = true;
        s.tenders[0].currentStage = "Contract awarded · PO issued";
        const v = s.vendors.find((x) => x.id === p.vendorId); if (v) { v.pos++; v.value += total; v.pending++; }
      });
      log("Purchase order released", `${p.po} to Signify Pakistan Ltd: ${pkr(total)} incl. tax.`, "Purchase Order", `Budget commitment ${pkr(before)} → ${pkr(after)}. PDF emailed to vendor.`);
      return ok("Purchase order released", `${p.po} emailed to the vendor. Budget committed.`);
    },

    postGRN: (poNo, g) => {
      const st = get();
      const p = st.purchaseOrders.find((x) => x.po === poNo);
      if (!p) return no("Unknown order", poNo);
      if (!["director", "storekeeper"].includes(st.role)) return no("Not permitted", "Goods receipt is recorded by the Central Storekeeper or Director Procurement.");
      const outstanding = p.qty - p.received;
      if (g.qty < 1 || g.qty > outstanding) return no("Check quantity", `Enter a quantity between 1 and ${outstanding}.`);
      if (g.rejected < 0 || g.rejected > g.qty) return no("Check rejected quantity", "Rejected cannot exceed the quantity received.");
      const accepted = g.qty - g.rejected;
      const L = st.itemLedgers[p.itemCode];
      const before = L ? computeLedger(L, new Date(2000, 0, 1), FAR_FUTURE).close : { qty: 0, wac: 0 };
      const grn = `GRN-LHR-2026-0${st.seq.grn}`;
      const item = st.itemsMaster.find((i) => i.code === p.itemCode);
      const sub = p.itemCode.split("-")[2];
      let tags = "";
      if (item?.classification.includes("Asset") && accepted > 0) {
        const base = st.tagSeq[sub] ?? 1;
        tags = accepted === 1 ? tagFor(sub, base) : `${tagFor(sub, base)} to ${tagFor(sub, base + accepted - 1)}`;
      }
      const late = parseD(p.due) < TODAY;
      set((s) => {
        s.seq.grn++;
        const po = s.purchaseOrders.find((x) => x.po === poNo)!;
        po.received += accepted;
        if (po.received >= po.qty) po.status = "Fully received";
        const it = s.itemsMaster.find((i) => i.code === po.itemCode);
        if (it && accepted > 0) {
          it.totalStock += accepted; it.centralStock += accepted;
          it.storeBreakdown["STORE-LHR-01"] = (it.storeBreakdown["STORE-LHR-01"] ?? 0) + accepted;
          s.itemLedgers[po.itemCode]?.entries.push({ date: TODAY_STR, type: "GRN", ref: grn, doc: po.po, qty: accepted, unitCost: po.unitPrice, party: po.vendor, purpose: "Receipt against purchase order" });
          if (tags) s.tagSeq[sub] = (s.tagSeq[sub] ?? 1) + accepted;
          const L2 = s.itemLedgers[po.itemCode];
          if (L2) it.avgCostPkr = Math.round(computeLedger(L2, new Date(2000, 0, 1), FAR_FUTURE).close.wac);
        }
        const v = s.vendors.find((x) => x.id === po.vendorId);
        if (v) {
          v.onTime = Math.round(v.onTime * 0.85 + (late ? 0 : 100) * 0.15);
          if (g.rejected) v.defects = Math.round((v.defects + (g.rejected / g.qty) * 100) * 10) / 10;
          if (po.received >= po.qty) v.pending = Math.max(0, v.pending - 1);
        }
        s.grns.unshift({ grn, po: po.po, date: TODAY_STR, qty: g.qty, accepted, rejected: g.rejected, inspector: g.inspector, remark: g.remark });
        s.invoices.unshift({ inv: "Awaiting invoice", po: po.po, grn, vendor: po.vendor, base: accepted * po.unitPrice, received: "—", match: "Awaiting invoice", status: "GRN received", ageing: 0 });
      });
      const L3 = get().itemLedgers[p.itemCode];
      const after = L3 ? computeLedger(L3, new Date(2000, 0, 1), FAR_FUTURE).close : { qty: 0, wac: 0 };
      log("Goods received", `${grn} against ${p.po}: ${accepted} accepted${g.rejected ? `, ${g.rejected} rejected` : ""}.`, "Goods Receipt", `Stock and weighted average cost updated for ${p.itemCode}.${tags ? ` Asset tags ${tags}.` : ""}${late ? " Late delivery recorded against vendor performance." : ""} Passed to Finance.`);
      return ok("GRN posted", `${grn}: stock updated and sent to Finance.`, { grn, stockBefore: before.qty, stockAfter: after.qty, wacBefore: before.wac, wacAfter: after.wac, tags });
    },

    captureInvoice: (grnNo, v) => {
      const st = get();
      const row = st.invoices.find((i) => i.grn === grnNo && i.match === "Awaiting invoice");
      const grn = st.grns.find((g) => g.grn === grnNo);
      const po = st.purchaseOrders.find((p) => p.po === row?.po);
      if (!row || !grn || !po) return no("Nothing to match", "This GRN is not waiting for an invoice.");
      const inv = v.inv.trim().toUpperCase();
      if (!inv) return no("Invoice number required", "Enter the vendor's tax invoice number.");
      if (st.invoices.some((i) => i.inv === inv)) return no("Duplicate invoice", `${inv} has already been captured.`);
      if (v.qty <= 0 || v.rate <= 0) return no("Check amounts", "Quantity and rate must be positive.");
      const rateVar = (v.rate - po.unitPrice) / po.unitPrice;
      const matched = v.qty === grn.accepted && Math.abs(rateVar) <= 0.01;
      set((s) => {
        const r = s.invoices.find((i) => i.grn === grnNo && i.match === "Awaiting invoice")!;
        Object.assign(r, { inv, received: TODAY_STR, ageing: 0 });
        if (matched) { r.match = "Matched"; r.status = "Approved for payment"; r.base = v.qty * v.rate; }
        else {
          r.match = "Exception"; r.status = "Routed to Procurement"; r.base = v.qty * v.rate;
          r.exception = {
            poQty: po.qty, grnQty: grn.accepted, invQty: v.qty, poRate: po.unitPrice, invRate: v.rate,
            note: `Invoice bills ${v.qty} at ${pkr(v.rate)}. GRN accepted ${grn.accepted} at the PO rate of ${pkr(po.unitPrice)}. Quantity variance ${v.qty - grn.accepted >= 0 ? "+" : ""}${v.qty - grn.accepted}, rate variance ${(rateVar * 100).toFixed(2)}% (tolerance 1.0%).`,
          };
        }
      });
      log(matched ? "Three-way match passed" : "Three-way match exception", `${inv} against ${po.po} / ${grnNo}: ${matched ? "within tolerance, approved for payment" : "outside tolerance, routed to Procurement"}.`, "Finance Gate");
      return matched ? ok("Matched within tolerance", `${inv} approved for payment.`) : no("Match exception", `${inv} is outside the 1% tolerance and was routed back to Procurement.`);
    },

    resolveException: (inv, how) => {
      set((s) => {
        const i = s.invoices.find((x) => x.inv === inv)!;
        if (how === "cap" && i.exception) { i.match = "Matched"; i.status = "Approved for payment"; i.base = i.exception.grnQty * i.exception.poRate; }
        else i.status = "Credit note requested";
      });
      log("Match exception resolved", `${inv}: ${how === "cap" ? "approved at matched value" : "credit note requested"}.`, "Finance Gate");
      return ok(how === "cap" ? "Approved at matched value" : "Credit note requested", inv);
    },

    releasePayment: (inv) => {
      const st = get();
      const i = st.invoices.find((x) => x.inv === inv);
      if (!i || i.status === "Paid") return no("Already paid", "This invoice has been settled.");
      if (i.status !== "Approved for payment") return no("Not cleared for payment", "Resolve the match before releasing payment.");
      if (!["cfo", "director"].includes(st.role)) return no("Not permitted", "Payments are released by Finance.");
      const ref = `RTGS-HBL-26-${80000 + Math.floor(Math.random() * 9999)}`;
      const gross = i.base * 1.18;
      set((s) => {
        const x = s.invoices.find((v) => v.inv === inv)!; x.status = "Paid"; x.paidRef = ref;
        const po = s.purchaseOrders.find((p) => p.po === x.po);
        const h = po && s.budgetHeads.find((b) => b.id === po.budgetHead);
        if (h) h.spent += gross;
      });
      const net = gross - i.base * 0.045;
      log("Payment released", `${inv}: ${pkr(net)} net to ${i.vendor}.`, "Finance Gate", `RTGS ${ref}. Withholding deducted under ITO 2001. Budget spent updated.`);
      return ok("Payment released", `RTGS ${ref} · ${pkr(net)} net.`);
    },

    transferStock: (t) => {
      const st = get();
      const item = st.itemsMaster.find((i) => i.code === t.code);
      if (!item) return no("Unknown item", t.code);
      const avail = t.from === "STORE-LHR-01" ? Math.max(0, (item.storeBreakdown[t.from] ?? 0) - (item.reserved ?? 0)) : item.storeBreakdown[t.from] ?? 0;
      if (t.from === t.to) return no("Choose two stores", "Source and destination must differ.");
      if ((st.stadiumStores.find((x) => x.id === t.to) as unknown as { status?: string })?.status === "Inactive") return no("Store closed", "The destination store is closed.");
      if (t.qty < 1 || t.qty > avail) return no("Check quantity", `Only ${avail} free to move at the source store${t.from === "STORE-LHR-01" && item.reserved ? ` (${item.reserved} reserved for demands)` : ""}.`);
      const ref = `TRF-2026-00${st.seq.trf}`;
      const name = (id: string) => st.stadiumStores.find((s) => s.id === id)?.name ?? id;
      set((s) => {
        s.seq.trf++;
        const it = s.itemsMaster.find((i) => i.code === t.code)!;
        it.storeBreakdown[t.from] -= t.qty;
        it.storeBreakdown[t.to] = (it.storeBreakdown[t.to] ?? 0) + t.qty;
        const L = s.itemLedgers[t.code];
        if (t.from === "STORE-LHR-01") { it.centralStock -= t.qty; L?.entries.push({ date: TODAY_STR, type: "TRANSFER_OUT", ref, doc: `To ${t.to}`, qty: -t.qty, party: name(t.to), purpose: t.reason }); }
        if (t.to === "STORE-LHR-01") { it.centralStock += t.qty; L?.entries.push({ date: TODAY_STR, type: "TRANSFER_IN", ref, doc: `From ${t.from}`, qty: t.qty, party: name(t.from), purpose: t.reason }); }
      });
      log("Stock transferred", `${ref}: ${t.qty} × ${t.code} from ${name(t.from)} to ${name(t.to)}.`, "Inventory");
      return ok("Transfer authorised", `${ref} awaiting receipt confirmation at ${name(t.to)}.`);
    },

    issueAsset: (v) => {
      const st = get();
      const item = st.itemsMaster.find((i) => i.code === v.itemCode);
      const holder = st.custodyHolders.find((h) => h.empId === v.empId);
      if (!item || !holder) return no("Check selection", "Choose an asset item and an employee.");
      if (!item.classification.includes("Asset")) return no("Not an asset", "Consumables are issued through a demand, not custody.");
      if ((item.storeBreakdown["STORE-LHR-01"] ?? 0) < 1) return no("Out of stock", `No ${item.name} at Gaddafi Central Store.`);
      if (!v.purpose.trim() || !v.location.trim()) return no("Purpose and location required", "Both are recorded on the custody receipt.");
      const sub = item.code.split("-")[2];
      const n = st.tagSeq[sub] ?? 1;
      const tag = tagFor(sub, n);
      const sin = `SIN-LHR-${st.seq.sin}`;
      const dept = st.departmentCustodians.find((d) => d.dept === holder.department);
      const ret = v.expectedReturn ? fmtD(new Date(v.expectedReturn)) : "—";
      set((s) => {
        s.seq.sin++; s.tagSeq[sub] = n + 1;
        const it = s.itemsMaster.find((i) => i.code === v.itemCode)!;
        it.storeBreakdown["STORE-LHR-01"] -= 1; it.centralStock -= 1; it.totalStock -= 1;
        s.itemLedgers[v.itemCode]?.entries.push({ date: TODAY_STR, type: "ISSUE", ref: sin, doc: tag, qty: -1, party: holder.department, custodian: dept?.custodian ?? "Departmental custodian", recipient: holder.name, purpose: v.purpose });
        const h = s.custodyHolders.find((x) => x.empId === v.empId)!;
        h.assets.push({ assetTag: tag, itemCode: it.code, description: it.name, issuedDate: TODAY_STR, valuePkr: it.avgCostPkr, condition: "New" });
        s.custodyMeta[tag] = { purpose: v.purpose, location: v.location, returnable: !!v.expectedReturn, expectedReturn: ret, lifecycle: "Issued", ack: "Pending", ackHours: 0 };
        const dc = s.departmentCustodians.find((d) => d.dept === h.department); if (dc) dc.items++;
      });
      log("Asset issued to employee", `${tag} (${item.code}) issued to ${holder.name} via ${dept?.custodian ?? "departmental custodian"}.`, "Custody Chain", `${sin}. Purpose: ${v.purpose}. Location: ${v.location}. Awaiting recipient confirmation.`);
      return ok("Asset issued", `${tag} tagged and issued. ${holder.name} has been asked to confirm receipt.`, { tag });
    },

    confirmCustody: (tag) => {
      set((s) => { Object.assign(s.custodyMeta[tag], { ack: "Confirmed", lifecycle: "In Use" }); });
      log("Custody confirmed", `${tag} acknowledged by the recipient.`, "Custody Chain");
      return ok("Custody confirmed", `${tag} is now in use.`);
    },

    remindCustody: (tag) => {
      const h = get().custodyHolders.find((x) => x.assets.some((a) => a.assetTag === tag));
      log("Custody reminder sent", `${tag}: email and in-app reminder to ${h?.name ?? "recipient"}.`, "Notifications");
      return ok("Reminder sent", `Email and in-app reminder sent to ${h?.name ?? "the recipient"}.`);
    },

    setLifecycle: (tag, v) => {
      if (v === "Disposed") return no("Approval required", "Disposal goes through the survey committee and approval. Use Propose disposal.");
      set((s) => { s.custodyMeta[tag].lifecycle = v; });
      log("Asset status changed", `${tag}: ${v}.`, "Custody Chain");
      return ok(`Status: ${v}`, tag);
    },

    handOver: (h) => {
      const st = get();
      const from = st.custodyHolders.find((x) => x.assets.some((a) => a.assetTag === h.tag));
      const to = st.custodyHolders.find((x) => x.empId === h.toEmpId);
      if (!from || !to) return no("Check selection", "Choose an asset and a new holder.");
      if (from.empId === to.empId) return no("Same holder", "Choose a different employee.");
      if (st.custodyMeta[h.tag]?.lifecycle === "Disposed") return no("Asset disposed", "Disposed assets cannot change hands.");
      set((s) => {
        const f = s.custodyHolders.find((x) => x.empId === from.empId)!;
        const t = s.custodyHolders.find((x) => x.empId === to.empId)!;
        const i = f.assets.findIndex((a) => a.assetTag === h.tag);
        const [asset] = f.assets.splice(i, 1);
        asset.issuedDate = TODAY_STR;
        t.assets.push(asset);
        Object.assign(s.custodyMeta[h.tag], { purpose: h.purpose, expectedReturn: h.expectedReturn ? fmtD(new Date(h.expectedReturn)) : "—", returnable: !!h.expectedReturn, lifecycle: "Issued", ack: "Pending", ackHours: 0 });
      });
      log("Custody handed over", `${h.tag}: ${from.name} → ${to.name}.`, "Custody Chain", "Awaiting recipient confirmation.");
      return ok("Handover recorded", `${to.name} has been asked to confirm receipt.`);
    },

    proposeDisposal: (v) => {
      const st = get();
      const holder = st.custodyHolders.find((x) => x.assets.some((a) => a.assetTag === v.tag));
      const asset = holder?.assets.find((a) => a.assetTag === v.tag);
      if (!holder || !asset) return no("Unknown asset", v.tag);
      if (st.custodyMeta[v.tag]?.lifecycle === "Disposed") return no("Already disposed", v.tag);
      if (st.disposals.some((d) => d.assetTag === v.tag && ["Survey committee review", "Awaiting approval"].includes(d.status))) return no("Already proposed", "A disposal for this asset is awaiting approval.");
      if (!v.reason.trim()) return no("Reason required", "Record the survey committee's finding.");
      const id = `DSP-2026-${String(st.seq.dsp).padStart(3, "0")}`;
      const apr = nextApr();
      set((s) => {
        s.seq.dsp++;
        s.disposals.unshift({ id, date: TODAY_STR, assetTag: v.tag, itemCode: asset.itemCode, description: asset.description, holder: holder.name, bookValue: asset.valuePkr, reason: v.reason, method: v.method, reservePrice: v.reservePrice, status: "Awaiting approval", approval: apr });
        s.approvals.unshift({
          id: apr, type: "Asset Disposal", ref: id, title: `${v.method}: ${v.tag} · ${asset.description.slice(0, 40)}`, amount: asset.valuePkr, band: "—", dept: "Stores & Custody Wing", requestedBy: s.roles[s.role].user, submitted: TODAY_STR, slaHours: 72, elapsedHours: 0, status: "pending",
          chain: [
            { role: "Survey Committee", name: "Condemnation board (3)", status: "approved", at: stamp(), remark: v.reason },
            { role: "Director Procurement", name: "Usman Zafar", status: "pending", roleKey: "director" },
            { role: "CFO", name: "Tariq Mehmood", status: "waiting", roleKey: "cfo" },
          ],
        });
      });
      log("Disposal proposed", `${id}: ${v.method.toLowerCase()} of ${v.tag} (${pkr(asset.valuePkr)} book value).`, "Disposal Register", `${v.reason}. Routed as ${apr}.`);
      return ok("Disposal proposed", `${id} routed for approval as ${apr}.`);
    },

    registerVendor: (v) => {
      const st = get();
      const ntn = v.ntn.trim();
      if (!v.name.trim()) return no("Name required", "Enter the registered company name.");
      if (!/^\d{7}-\d$/.test(ntn)) return no("Invalid NTN", "FBR NTN format is 1234567-8.");
      if (v.strn.trim() && !/^\d{13}$/.test(v.strn.trim().replace(/-/g, ""))) return no("Invalid STRN", "Sales tax registration number has 13 digits.");
      const dup = st.vendors.find((x) => x.ntn === ntn);
      if (dup) return no("Already registered", `NTN ${ntn} belongs to ${dup.name} (${dup.id}).`);
      const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n || 0)));
      const b = { financial: clamp(v.financial), technical: clamp(v.technical), past: clamp(v.past), turnover: clamp(v.turnover) };
      const score = Math.round(b.financial * 0.3 + b.technical * 0.35 + b.past * 0.2 + b.turnover * 0.15);
      const id = `VND-0${st.seq.vnd}`;
      const status = score >= 60 ? "Eligible" : "Not qualified";
      set((s) => {
        s.seq.vnd++;
        s.vendors.push({
          id, name: v.name.trim(), ntn, strn: v.strn.trim(), category: v.category, atl: true, prequal: score, rating: 0, onTime: 100, defects: 0, status,
          nextDoc: "Chamber membership certificate", nextExpiry: fmtD(addDays(TODAY, 365)), expiryDays: 365, pos: 0, value: 0, pending: 0,
          email: v.email, phone: v.phone, address: v.address, registeredOn: TODAY_STR, prequalBreakdown: b,
        });
      });
      log("Vendor registered", `${id} ${v.name.trim()} · prequalification ${score}/100 (${status}).`, "Vendor Control", `NTN ${ntn} verified on the Active Taxpayer List. Category: ${v.category}.`);
      return ok(status === "Eligible" ? "Vendor registered and prequalified" : "Vendor registered, not qualified", `${id} scored ${score}/100 against the 60-point cut-off.`, { id, score });
    },

    proposeBlacklist: (vendorId, reason, period) => {
      const v = get().vendors.find((x) => x.id === vendorId);
      if (!v) return no("Unknown vendor", vendorId);
      if (!reason.trim()) return no("Reason required", "Record the grounds for debarment.");
      const id = nextApr();
      set((s) => {
        s.vendors.find((x) => x.id === vendorId)!.status = "Blacklisting proposed";
        s.approvals.unshift({
          id, type: "Vendor Blacklisting", ref: vendorId, title: `Debar ${v.name} for ${period}`, amount: null, band: "—", dept: "Procurement Wing", requestedBy: s.roles[s.role].user, submitted: TODAY_STR, slaHours: 120, elapsedHours: 0, status: "pending",
          chain: [
            { role: "Procurement Committee", name: "Committee", status: "approved", at: stamp(), remark: reason },
            { role: "Director Procurement", name: "Usman Zafar", status: "pending", roleKey: "director" },
          ],
        });
      });
      log("Blacklisting proposed", `${v.name}: ${period}.`, "Vendor Control", reason);
      return ok("Proposal submitted", `${v.name} is excluded from new RFQs until decided.`);
    },

    openEnvelopes: () => { set((s) => { s.vaultOpen = true; }); log("Financial envelopes opened", "Tender 089: opened in the presence of the committee.", "Bid Evaluation"); return ok("Envelopes opened", "Opening event recorded."); },
    toggleRfqVendor: (id, on) => {
      if (get().rfqState.dispatched) return no("Already dispatched", "The invitation list is locked.");
      set((s) => { const sel = new Set(s.rfqState.selected); if (on) sel.add(id); else sel.delete(id); s.rfqState.selected = [...sel]; });
      return ok("Updated", id);
    },
    dispatchRfq: () => {
      const st = get();
      if (st.rfqState.selected.length < 3) return no("Minimum 3 vendors required", "PPRA requires at least three quotations for an RFQ.");
      const debarred = st.rfqState.selected.filter((id) => st.vendors.find((v) => v.id === id)?.status !== "Eligible");
      if (debarred.length) return no("Ineligible vendor selected", `${debarred.join(", ")} cannot be invited.`);
      set((s) => { s.rfqState.dispatched = true; });
      const n = st.rfqState.selected.length;
      log("RFQ dispatched", `${st.rfq.id} emailed to ${n} vendors.`, "Sourcing");
      return ok("RFQ sent", `${st.rfq.id} emailed to ${n} vendors.`);
    },
    receiveQuote: () => {
      const st = get();
      const next = st.rfq.quoteBook.find((b) => st.rfqState.selected.includes(b.vendorId) && !st.rfqState.quotes.some((q) => q.vendorId === b.vendorId));
      if (!next) return no("No more quotations", "Every invited vendor has responded.");
      set((s) => { s.rfqState.quotes.push({ ...next, at: stamp() }); });
      const v = st.vendors.find((x) => x.id === next.vendorId);
      log("Quotation received", `${st.rfq.id}: ${v?.name ?? next.vendorId} quoted ${pkr(next.base)}.`, "Sourcing");
      return ok("Quotation received", `${v?.name ?? next.vendorId}: ${pkr(next.base)}, timestamped.`);
    },
    approveRfqCst: () => {
      const st = get();
      const rs = st.rfqState;
      if (rs.po) return no("Already ordered", `${rs.po} was issued from this comparative statement.`);
      if (rs.quotes.length < 3) return no("Quorum not reached", "At least three quotations are needed.");
      if (st.role !== "director") return no("Band B2 approval", "Comparative statements up to PKR 3M are approved by the Director Procurement. Committee members evaluate but cannot award.");
      const l1 = [...rs.quotes].sort((a, b) => a.base - b.base)[0];
      const v = st.vendors.find((x) => x.id === l1.vendorId)!;
      const item = st.itemsMaster.find((i) => i.code === st.rfq.itemCode);
      const weeks = parseInt(l1.delivery, 10) || 4;
      const poNo = `PO-PCB-2026-0${st.seq.po}`;
      const p: PurchaseOrder = {
        po: poNo, date: TODAY_STR, vendor: v.name, vendorId: v.id, source: `RFQ ${st.rfq.id}`, itemCode: st.rfq.itemCode, item: item?.name ?? st.rfq.title,
        qty: 2, received: 0, unitPrice: l1.base / 2, taxRate: 0.18, budgetHead: "BH-CAP-INF", due: fmtD(addDays(TODAY, weeks * 7)),
        ld: "0.1% per day, max 10%", terms: "100% within 30 days of GRN and matched invoice", status: "Issued",
      };
      const total = l1.base * 1.18;
      set((s) => {
        s.seq.po++;
        s.purchaseOrders.unshift(p);
        s.rfqState.po = poNo;
        const h = s.budgetHeads.find((b) => b.id === p.budgetHead)!; h.committed += total;
        const vv = s.vendors.find((x) => x.id === v.id)!; vv.pos++; vv.value += total; vv.pending++;
      });
      log("Comparative statement approved", `${st.rfq.id}: L1 ${v.name} at ${pkr(total)} incl. 18% GST.`, "Bid Evaluation", `Band ${bandFor(total)} approval by Director Procurement. ${rs.quotes.length} quotations compared on evaluated cost.`);
      log("Purchase order released", `${poNo} to ${v.name}: ${pkr(total)} incl. tax.`, "Purchase Order", `Generated from the approved comparative statement with no re-keying. Budget committed on Stadium Infrastructure CapEx.`);
      return ok("Comparative statement approved", `${poNo} generated for ${v.name} and emailed.`, { po: poNo });
    },
    addSbdComment: (text) => {
      if (get().sbdLocked) return no("Document locked", "The signed version cannot be commented on.");
      if (!text.trim()) return no("Empty comment", "Write a comment first.");
      set((s) => { s.sbdComments.push({ by: s.roles[s.role].user, role: s.roles[s.role].label, at: stamp(), text }); });
      log("Committee remark recorded", `SBD v4.2-PCB-089: ${text.slice(0, 80)}`, "Sourcing");
      return ok("Comment recorded", "Added to the committee sign-off log.");
    },
    lockSbd: () => { set((s) => { s.sbdLocked = true; }); log("Bidding document locked", "SBD v4.2-PCB-089 signed off and locked.", "Sourcing"); return ok("Bidding document signed and locked", "Signed version recorded."); },
    releaseGuarantee: (i) => {
      const g = get().guarantees[i];
      if (!g || g.status === "Released") return no("Nothing to release", "This instrument is already released.");
      set((s) => { s.guarantees[i].status = "Released"; });
      log("Bid security released", g.instrument, "Sourcing");
      return ok("Security released", `${g.instrument} returned to bidder.`);
    },
    scheduleReport: (r) => {
      const next = ({ Weekly: fmtD(addDays(TODAY, 7 - ((TODAY.getDay() + 6) % 7))) + " 07:00", Monthly: "01-Nov-2026 07:00", Quarterly: "01-Jan-2027 07:00", Annual: "01-Jul-2027 07:00" } as Record<string, string>)[r.freq];
      set((s) => { s.scheduled.unshift({ ...r, next }); });
      log("Report scheduled", `${r.name}: ${r.freq.toLowerCase()} to ${r.to}.`, "Reports");
      return ok("Report scheduled", `Next delivery ${next}.`);
    },
  };
}

/* ---------- Selectors ---------- */
export function tenderGates(s: Pick<EngineState, "approvals" | "grievances" | "budgetHeads" | "t089">) {
  const a = s.approvals.find((x) => x.id === "APR-2026-0186");
  const grvOpen = s.grievances.some((g) => g.tender === T089 && !g.status.startsWith("Closed"));
  const head = s.budgetHeads.find((b) => b.id === "BH-CAP-INF")!;
  return [
    { label: "Committee evaluation signed, conflict-of-interest declarations on file", ok: true, href: "/sourcing" },
    { label: "Comparative statement approved through band B5 (APR-2026-0186)", ok: a?.status === "approved", href: "/approvals?id=APR-2026-0186" },
    { label: "Intention to Award published", ok: s.t089.ita, href: "/approvals" },
    { label: "Standstill window closed with no open grievance", ok: s.t089.closed && !grvOpen, href: "/approvals" },
    { label: "Awardee not blacklisted (Signify Pakistan Ltd)", ok: true },
    { label: `Budget available on ${head.name}`, ok: head.allocation - head.committed >= 56876000 },
  ];
}

export function ledgerFor(s: Pick<Data, "itemLedgers">, code: string, from: Date, to: Date) {
  const L = s.itemLedgers[code];
  return L ? computeLedger(L, from, to) : null;
}
