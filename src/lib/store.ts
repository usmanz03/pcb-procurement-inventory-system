"use client";

/*
 * Client-side mock backend for the POC.
 * Each action mirrors an endpoint planned for the FastAPI service (noted per action),
 * so the UI can later swap this store for HTTP calls without changing components.
 */
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import seedJson from "./seed.json";
import { bandFor, computeLedger, FAR_FUTURE, fmtD, pkr, poValue, stamp, TODAY_STR } from "./domain";
import type {
  Activity, Approval, BudgetHead, CustodyHolder, CustodyMeta, Demand, Grievance, Grn, Guarantee, Intention, Invoice,
  Item, ItemLedger, Lifecycle, PurchaseOrder, Quote, Role, RoleKey, Store, Tender, Vendor,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const seed = seedJson as any;

export interface Data {
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
  stockTake: { id: string; store: string; date: string; countedBy: string; status: string; lines: { code: string; book: number; counted: number }[] };
  deadStock: { code: string; name: string; store: string; qty: number; value: number; lastMovement: string; days: number }[];
  vendors: Vendor[];
  purchaseOrders: PurchaseOrder[];
  grns: Grn[];
  invoices: Invoice[];
  sbdTemplates: { name: string; version: string; updated: string; status: string }[];
  sbdComments: { by: string; role: string; at: string; text: string }[];
  rfq: { id: string; title: string; estValue: number; closes: string; vendorIds: string[]; quoteBook: Quote[] };
  bidTerms: Record<string, { delivery: string; warranty: string; payment: string }>;
  guarantees: Guarantee[];
  departmentCustodians: { dept: string; custodian: string; holders: number; items: number }[];
  custodyMeta: Record<string, CustodyMeta>;
  ackEscalationHours: number;
  spendByDept: { name: string; value: number }[];
  spendByCategory: { name: string; value: number }[];
  tenderHistory: { ref: string; title: string; method: string; value: number; bidders: number; stage: string; days: number }[];
  reconciliationRecord: any;
}

interface Session {
  role: RoleKey;
  t089: { ita: boolean; closed: boolean; po: boolean };
  vaultOpen: boolean;
  rfqState: { dispatched: boolean; selected: string[]; quotes: Quote[] };
  sbdLocked: boolean;
  scheduled: { name: string; freq: string; to: string; fmt: string; next: string }[];
  seq: { grn: number; apr: number; demand: number; sin: number; pr: number; trf: number };
  tagSeq: Record<string, number>;
}

export type Result = { ok: true; title: string; message: string } | { ok: false; title: string; message: string };

interface Actions {
  setRole: (r: RoleKey) => void;
  reset: () => void;
  log: (title: string, desc: string, badge: string, details?: string) => void;
  // POST /approvals/{id}/decision
  decideApproval: (id: string, action: "approve" | "reject" | "return", remark: string, demo?: boolean) => Result;
  // POST /approvals/{id}/reroute
  rerouteApproval: (id: string) => Result;
  // POST /tenders/{ref}/standstill/close
  closeStandstill: (tender: string) => void;
  // POST /grievances, PATCH /grievances/{id}
  addGrievance: (g: { tender: string; subject: string; complainant: string; ground: string }) => Result;
  decideGrievance: (id: string, status: string) => void;
  endDelegation: () => void;
  // POST /tenders/089/purchase-orders
  issuePO089: () => Result;
  // POST /purchase-orders/{po}/grns
  postGRN: (po: string, g: { qty: number; rejected: number; inspector: string; remark: string }) => Result & { detail?: { grn: string; stockBefore: number; stockAfter: number; wacBefore: number; wacAfter: number; tags: string } };
  // POST /invoices/{inv}/resolution, POST /payments
  resolveException: (inv: string, how: "cap" | "credit") => void;
  releasePayment: (inv: string) => Result;
  // POST /demands
  submitDemand: (d: { dept: string; itemCode: string; qty: number; requiredBy: string; purpose: string; budgetHead: string }) => Result;
  // POST /stock-transfers
  transferStock: (t: { code: string; from: string; to: string; qty: number; reason: string }) => Result;
  approveStockTake: () => void;
  // Custody: POST /custody/{tag}/confirm, PATCH /custody/{tag}, POST /custody/handover
  confirmCustody: (tag: string) => void;
  setLifecycle: (tag: string, s: Lifecycle) => void;
  handOver: (h: { tag: string; toEmpId: string; purpose: string; expectedReturn: string }) => Result;
  // POST /item-codes, POST /vendors/{id}/blacklist-proposals
  requestItemCode: (c: { code: string; desc: string; nature: string; exp: string; uom: string; dupOf?: string }) => Result;
  proposeBlacklist: (vendorId: string, reason: string, period: string) => Result;
  // Sourcing
  openEnvelopes: () => void;
  toggleRfqVendor: (id: string, on: boolean) => void;
  dispatchRfq: () => Result;
  receiveQuote: () => void;
  addSbdComment: (text: string) => void;
  lockSbd: () => void;
  releaseGuarantee: (i: number) => void;
  scheduleReport: (s: { name: string; freq: string; to: string; fmt: string }) => Result;
}

export type AppState = Data & Session & Actions;

function initialData(): Data {
  const d: Data = JSON.parse(JSON.stringify(seed));
  d.methodThresholds = d.methodThresholds.map((t) => ({ ...t, max: t.max ?? Infinity }));
  // Weighted average cost always derives from the ledger
  d.itemsMaster.forEach((i) => {
    const L = d.itemLedgers[i.code];
    if (L) i.avgCostPkr = Math.round(computeLedger(L, new Date(2000, 0, 1), FAR_FUTURE).close.wac);
  });
  d.recentActivities.forEach((a) => (a.user = a.user ?? "System"));
  return d;
}

function initialSession(): Session {
  return {
    role: "director",
    t089: { ita: false, closed: false, po: false },
    vaultOpen: true,
    rfqState: { dispatched: false, selected: ["VND-0203", "VND-0144", "VND-0159"], quotes: [] },
    sbdLocked: false,
    scheduled: [
      { name: "Item ledger, all items", freq: "Monthly", to: "cfo@pcb.com.pk", fmt: "PDF + Excel", next: "01-Nov-2026 07:00" },
      { name: "Vendor performance", freq: "Quarterly", to: "director.procurement@pcb.com.pk", fmt: "PDF", next: "01-Jan-2027 07:00" },
    ],
    seq: { grn: 504, apr: 190, demand: 1052, sin: 8903, pr: 4408, trf: 48 },
    tagSeq: { LGT: 21, MOW: 7, HWK: 13, REC: 15 },
  };
}

export const useApp = create<AppState>()(
  immer((set, get) => ({
    ...initialData(),
    ...initialSession(),

    setRole: (r) => set((s) => { s.role = r; }),
    reset: () => set(() => ({ ...initialData(), ...initialSession() })),

    log: (title, desc, badge, details) =>
      set((s) => {
        s.recentActivities.unshift({ id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title, desc, time: stamp(), badge, details: details ?? desc, user: s.roles[s.role].user });
        if (s.recentActivities.length > 60) s.recentActivities.pop();
      }),

    decideApproval: (id, action, remark, demo = false) => {
      const st = get();
      const a = st.approvals.find((x) => x.id === id);
      const step = a?.chain.find((c) => c.status === "pending");
      if (!a || !step) return { ok: false, title: "Nothing to decide", message: "This request has no pending step." };
      if ((action === "reject" || action === "return") && !remark.trim()) return { ok: false, title: "Remark required", message: "Add a remark before rejecting or returning." };
      const user = st.roles[st.role].user;
      let next: string | undefined;
      let final = false;
      set((s) => {
        const ap = s.approvals.find((x) => x.id === id)!;
        const sp = ap.chain.find((c) => c.status === "pending")!;
        sp.at = stamp();
        if (!demo && sp.roleKey) sp.name = user;
        if (action === "approve") {
          sp.status = "approved";
          sp.remark = remark.trim() || (demo ? "Approved (recorded by Board Secretariat)." : "Approved.");
          const n = ap.chain.find((c) => c.status === "waiting");
          if (n) { n.status = "pending"; ap.elapsedHours = 0; next = n.role; } else { ap.status = "approved"; final = true; }
        } else {
          sp.status = action === "reject" ? "rejected" : "returned";
          sp.remark = remark.trim();
          ap.status = action === "reject" ? "rejected" : "returned";
        }
      });
      const verb = action === "approve" ? "approved" : action === "reject" ? "rejected" : "returned";
      get().log(`${a.type} ${verb}`, `${a.ref}: ${step.role} ${verb}${next ? `, routed to ${next}` : final ? " (final)" : ""}.`, "Approval Workflow", `${a.id}. Remark: ${remark || "—"}`);
      if (final) onApprovalComplete(a.id);
      if (action === "approve") return { ok: true, title: final ? "Final approval recorded" : "Approved and routed", message: final ? `${a.ref} is fully approved.` : `${a.ref} moved to ${next}.` };
      return { ok: true, title: action === "reject" ? "Rejected" : "Returned for clarification", message: `${a.requestedBy} has been notified.` };
    },

    rerouteApproval: (id) => {
      set((s) => {
        const a = s.approvals.find((x) => x.id === id)!;
        const step = a.chain.find((c) => c.status === "pending")!;
        Object.assign(step, { role: "CFO (alternate approver)", name: "Tariq Mehmood", roleKey: "cfo" });
        a.requestedBy = `${a.requestedBy} (self-raised)`;
        a.sodBlocked = true;
      });
      const a = get().approvals.find((x) => x.id === id)!;
      get().log("Self-approval prevented", `${a.ref} re-routed to CFO under segregation of duties.`, "Access Control");
      return { ok: true, title: "Routed to alternate approver", message: `${a.ref} now waits for the CFO.` };
    },

    closeStandstill: (tender) => {
      set((s) => {
        const t = s.intentions.find((x) => x.tender === tender);
        if (t) t.elapsed = t.days;
        if (tender === "PCB/LOG-PSL10/2026/089") s.t089.closed = true;
      });
      get().log("Standstill window closed", `${tender}: grievance window ended.`, "PPRA Compliance");
    },

    addGrievance: (g) => {
      const id = `GRV-2026-${String(get().grievances.length + 6).padStart(3, "0")}`;
      set((s) => { s.grievances.unshift({ id, ...g, filed: TODAY_STR, committee: "Grievance Redressal Committee (3)", hearing: "To be scheduled", status: "Hearing to be scheduled" }); });
      get().log("Grievance registered", `${id} against ${g.tender}.`, "PPRA Compliance", `${g.complainant}: ${g.ground}`);
      return { ok: true, title: "Grievance registered", message: `${id} assigned to the redressal committee. PO release stays locked.` };
    },

    decideGrievance: (id, status) => {
      set((s) => { const g = s.grievances.find((x) => x.id === id)!; g.status = status; if (g.hearing === "To be scheduled") g.hearing = TODAY_STR; });
      get().log("Grievance decided", `${id}: ${status}.`, "PPRA Compliance");
    },

    endDelegation: () => { set((s) => { s.delegation.active = false; }); get().log("Delegation ended", "COO → CFO delegation ended.", "Approval Workflow"); },

    issuePO089: () => {
      const p: PurchaseOrder = {
        po: "PO-PCB-2026-0331", date: TODAY_STR, vendor: "Signify Pakistan Ltd (Philips Lighting)", vendorId: "VND-0101", source: "Tender PCB/LOG-PSL10/2026/089",
        itemCode: "PCB-INF-LGT-0018", item: "Philips ArenaVision LED luminaire 1500W", qty: 110, received: 0, unitPrice: 400000,
        extras: [{ desc: "Turnkey rigging, aiming and commissioning (lump sum)", amount: 4200000 }], taxRate: 0.18, budgetHead: "BH-CAP-INF",
        due: "20-Jan-2027", ld: "0.1% per day, max 10%", terms: "10% advance against bank guarantee, 90% on commissioning", status: "Issued",
      };
      const total = poValue(p) * 1.18;
      let before = 0, after = 0;
      set((s) => {
        s.purchaseOrders.unshift(p);
        const h = s.budgetHeads.find((b) => b.id === p.budgetHead)!;
        before = h.committed; h.committed += total; after = h.committed;
        s.t089.po = true;
        s.tenders[0].currentStage = "Contract awarded · PO issued";
      });
      get().log("Purchase order released", `${p.po} to Signify Pakistan Ltd: ${pkr(total)} incl. tax.`, "Purchase Order", `Budget commitment ${pkr(before)} → ${pkr(after)}. PDF emailed to vendor.`);
      return { ok: true, title: "Purchase order released", message: `${p.po} emailed to the vendor. Budget committed.` };
    },

    postGRN: (poNo, g) => {
      const st = get();
      const p = st.purchaseOrders.find((x) => x.po === poNo)!;
      const outstanding = p.qty - p.received;
      if (g.qty < 1 || g.qty > outstanding) return { ok: false, title: "Check quantity", message: `Enter a quantity between 1 and ${outstanding}.` };
      if (g.rejected < 0 || g.rejected > g.qty) return { ok: false, title: "Check rejected quantity", message: "Rejected cannot exceed the quantity received." };
      const accepted = g.qty - g.rejected;
      const L = st.itemLedgers[p.itemCode];
      const before = L ? computeLedger(L, new Date(2000, 0, 1), FAR_FUTURE).close : { qty: 0, wac: 0 };
      const grn = `GRN-LHR-2026-0${st.seq.grn}`;
      const item = st.itemsMaster.find((i) => i.code === p.itemCode)!;
      let tags = "";
      if (item.classification.includes("Asset") && accepted > 0) {
        const sub = p.itemCode.split("-")[2];
        const base = st.tagSeq[sub] ?? 1;
        tags = `PCB-AST-${sub}-${String(base).padStart(3, "0")} to PCB-AST-${sub}-${String(base + accepted - 1).padStart(3, "0")}`;
      }
      set((s) => {
        s.seq.grn++;
        const po = s.purchaseOrders.find((x) => x.po === poNo)!;
        po.received += accepted;
        const it = s.itemsMaster.find((i) => i.code === po.itemCode)!;
        if (accepted > 0) {
          it.totalStock += accepted; it.centralStock += accepted;
          it.storeBreakdown["STORE-LHR-01"] = (it.storeBreakdown["STORE-LHR-01"] ?? 0) + accepted;
          s.itemLedgers[po.itemCode]?.entries.push({ date: TODAY_STR, type: "GRN", ref: grn, doc: po.po, qty: accepted, unitCost: po.unitPrice, party: po.vendor, purpose: "Receipt against purchase order" });
          const sub = po.itemCode.split("-")[2];
          if (tags) s.tagSeq[sub] = (s.tagSeq[sub] ?? 1) + accepted;
        }
        const L2 = s.itemLedgers[po.itemCode];
        if (L2) it.avgCostPkr = Math.round(computeLedger(L2, new Date(2000, 0, 1), FAR_FUTURE).close.wac);
        s.grns.unshift({ grn, po: po.po, date: TODAY_STR, qty: g.qty, accepted, rejected: g.rejected, inspector: g.inspector, remark: g.remark });
        s.invoices.unshift({ inv: "Awaiting invoice", po: po.po, grn, vendor: po.vendor, base: accepted * po.unitPrice, received: "—", match: "Awaiting invoice", status: "GRN received", ageing: 0 });
      });
      const after = L ? computeLedger(get().itemLedgers[p.itemCode], new Date(2000, 0, 1), FAR_FUTURE).close : { qty: 0, wac: 0 };
      get().log("Goods received", `${grn} against ${p.po}: ${accepted} accepted${g.rejected ? `, ${g.rejected} rejected` : ""}.`, "Goods Receipt", `Stock and weighted average cost updated for ${p.itemCode}. Passed to Finance.`);
      return { ok: true, title: "GRN posted", message: `${grn}: stock updated and sent to Finance.`, detail: { grn, stockBefore: before.qty, stockAfter: after.qty, wacBefore: before.wac, wacAfter: after.wac, tags } };
    },

    resolveException: (inv, how) => {
      set((s) => {
        const i = s.invoices.find((x) => x.inv === inv)!;
        if (how === "cap" && i.exception) { i.match = "Matched"; i.status = "Approved for payment"; i.base = i.exception.grnQty * i.exception.poRate; }
        else i.status = "Credit note requested";
      });
      get().log("Match exception resolved", `${inv}: ${how === "cap" ? "approved at matched value" : "credit note requested"}.`, "Finance Gate");
    },

    releasePayment: (inv) => {
      const i = get().invoices.find((x) => x.inv === inv);
      if (!i || i.status === "Paid") return { ok: false, title: "Already paid", message: "This invoice has been settled." };
      if (i.status !== "Approved for payment") return { ok: false, title: "Not cleared for payment", message: "Resolve the match before releasing payment." };
      const ref = `RTGS-HBL-26-${80000 + Math.floor(Math.random() * 9999)}`;
      set((s) => { const x = s.invoices.find((v) => v.inv === inv)!; x.status = "Paid"; x.paidRef = ref; });
      const net = i.base * 1.18 - i.base * 0.045;
      get().log("Payment released", `${inv}: ${pkr(net)} net to ${i.vendor}.`, "Finance Gate", `RTGS ${ref}. Withholding deducted under ITO 2001.`);
      return { ok: true, title: "Payment released", message: `RTGS ${ref} · ${pkr(net)} net.` };
    },

    submitDemand: (d) => {
      const st = get();
      const item = st.itemsMaster.find((i) => i.code === d.itemCode)!;
      const avail = item.storeBreakdown["STORE-LHR-01"] ?? 0;
      const issue = Math.min(avail, d.qty), prQty = d.qty - issue;
      const id = `REQ-2026-${st.seq.demand}`;
      const sin = issue ? `SIN-LHR-${st.seq.sin}` : null;
      const pr = prQty ? `PR-AUTO-${st.seq.pr}` : null;
      const user = st.roles[st.role].user;
      const prValue = prQty * item.avgCostPkr;
      const band = bandFor(prValue);
      set((s) => {
        s.seq.demand++; if (issue) s.seq.sin++; if (prQty) s.seq.pr++;
        if (issue) {
          const it = s.itemsMaster.find((i) => i.code === d.itemCode)!;
          it.storeBreakdown["STORE-LHR-01"] -= issue; it.centralStock -= issue; it.totalStock -= issue;
          s.itemLedgers[d.itemCode]?.entries.push({ date: TODAY_STR, type: "ISSUE", ref: sin!, doc: id, qty: -issue, party: d.dept, custodian: "Departmental custodian", recipient: user, purpose: d.purpose });
        }
        s.demands.unshift({ id, date: TODAY_STR, dept: d.dept, by: user, itemCode: d.itemCode, qty: d.qty, issued: issue, prQty, branch: prQty === 0 ? "full" : issue === 0 ? "none" : "partial", sin, pr, requiredBy: d.requiredBy, purpose: d.purpose, budgetHead: d.budgetHead, status: prQty ? "PR in approval" : "Fulfilled from stock" });
        if (prQty) {
          s.approvals.unshift({
            id: `APR-2026-0${s.seq.apr++}`, type: "Purchase Requisition", ref: pr!, title: `${prQty} × ${item.name.slice(0, 50)}`, amount: prValue, band, dept: d.dept, requestedBy: user, submitted: TODAY_STR, slaHours: 48, elapsedHours: 0, status: "pending", demandId: id,
            chain: [
              { role: "Head of Department", name: "Department head", status: "approved", at: stamp(), remark: d.purpose },
              { role: "Director Procurement", name: "Usman Zafar", status: "pending", roleKey: "director" },
              ...(["B3", "B4", "B5"].includes(band) ? [{ role: "CFO", name: "Tariq Mehmood", status: "waiting" as const, roleKey: "cfo" as const }] : []),
            ],
          });
        }
      });
      get().log("Demand raised", `${id}: ${d.qty} × ${d.itemCode}${issue ? `, ${issue} issued (${sin})` : ""}${prQty ? `, ${prQty} to ${pr}` : ""}.`, "Auto Branching", `Purpose: ${d.purpose}.`);
      return { ok: true, title: "Demand submitted", message: `${id}${sin ? ` · ${sin} issued` : ""}${pr ? ` · ${pr} sent for approval` : ""}` };
    },

    transferStock: (t) => {
      const st = get();
      const item = st.itemsMaster.find((i) => i.code === t.code)!;
      const avail = item.storeBreakdown[t.from] ?? 0;
      if (t.from === t.to) return { ok: false, title: "Choose two stores", message: "Source and destination must differ." };
      if (t.qty < 1 || t.qty > avail) return { ok: false, title: "Check quantity", message: `Only ${avail} available at the source store.` };
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
      get().log("Stock transferred", `${ref}: ${t.qty} × ${t.code} from ${name(t.from)} to ${name(t.to)}.`, "Inventory");
      return { ok: true, title: "Transfer authorised", message: `${ref} awaiting receipt confirmation at ${name(t.to)}.` };
    },

    approveStockTake: () => {
      set((s) => {
        s.stockTake.lines.filter((l) => l.counted !== l.book).forEach((l) => {
          const v = l.counted - l.book;
          const it = s.itemsMaster.find((i) => i.code === l.code)!;
          it.totalStock += v; it.centralStock += v; it.storeBreakdown["STORE-LHR-01"] += v;
          s.itemLedgers[l.code]?.entries.push({ date: TODAY_STR, type: "ADJUST", ref: s.stockTake.id, doc: "Stock-take variance", qty: v, party: "Gaddafi Central Store", purpose: "Approved stock-take adjustment" });
          l.book = l.counted;
        });
        s.stockTake.status = "Approved";
      });
      get().log("Stock-take adjustment approved", "Variance posted to the ledger as a separate entry.", "Inventory");
    },

    confirmCustody: (tag) => {
      set((s) => { Object.assign(s.custodyMeta[tag], { ack: "Confirmed", lifecycle: "In Use" }); });
      get().log("Custody confirmed", `${tag} acknowledged by the recipient.`, "Custody Chain");
    },

    setLifecycle: (tag, v) => {
      set((s) => { s.custodyMeta[tag].lifecycle = v; });
      get().log("Asset status changed", `${tag}: ${v}.`, "Custody Chain");
    },

    handOver: (h) => {
      const st = get();
      const from = st.custodyHolders.find((x) => x.assets.some((a) => a.assetTag === h.tag))!;
      const to = st.custodyHolders.find((x) => x.empId === h.toEmpId)!;
      if (from.empId === to.empId) return { ok: false, title: "Same holder", message: "Choose a different employee." };
      set((s) => {
        const f = s.custodyHolders.find((x) => x.empId === from.empId)!;
        const t = s.custodyHolders.find((x) => x.empId === to.empId)!;
        const i = f.assets.findIndex((a) => a.assetTag === h.tag);
        const [asset] = f.assets.splice(i, 1);
        asset.issuedDate = TODAY_STR;
        t.assets.push(asset);
        Object.assign(s.custodyMeta[h.tag], { purpose: h.purpose, expectedReturn: h.expectedReturn ? fmtD(new Date(h.expectedReturn)) : "—", returnable: !!h.expectedReturn, lifecycle: "Issued", ack: "Pending", ackHours: 0 });
      });
      get().log("Custody handed over", `${h.tag}: ${from.name} → ${to.name}.`, "Custody Chain", "Awaiting recipient confirmation.");
      return { ok: true, title: "Handover recorded", message: `${to.name} has been asked to confirm receipt.` };
    },

    requestItemCode: (c) => {
      const st = get();
      const id = `APR-2026-0${st.seq.apr}`;
      set((s) => {
        s.seq.apr++;
        s.approvals.unshift({
          id, type: "Item Code Request", ref: c.code, title: `New code: ${c.desc}`, amount: null, band: "—", dept: "Catalogue", requestedBy: s.roles[s.role].user, submitted: TODAY_STR, slaHours: 24, elapsedHours: 0, status: "pending",
          chain: [
            { role: "Catalogue Officer", name: "Saima Khan", status: "approved", at: stamp(), remark: c.dupOf ? `Possible duplicate of ${c.dupOf} reviewed; distinct specification.` : "No duplicate found." },
            { role: "Director Procurement", name: "Usman Zafar", status: "pending", roleKey: "director" },
          ],
        });
      });
      get().log("Item code requested", `${c.code}: ${c.desc}.`, "Item Master", `${c.nature}, ${c.exp}, ${c.uom}. Routed as ${id}.`);
      return { ok: true, title: "Code submitted for approval", message: `${c.code} routed as ${id}.` };
    },

    proposeBlacklist: (vendorId, reason, period) => {
      const st = get();
      const v = st.vendors.find((x) => x.id === vendorId)!;
      set((s) => {
        s.vendors.find((x) => x.id === vendorId)!.status = "Blacklisting proposed";
        s.approvals.unshift({
          id: `APR-2026-0${s.seq.apr++}`, type: "Vendor Blacklisting", ref: vendorId, title: `Debar ${v.name} for ${period}`, amount: null, band: "—", dept: "Procurement Wing", requestedBy: s.roles[s.role].user, submitted: TODAY_STR, slaHours: 120, elapsedHours: 0, status: "pending",
          chain: [
            { role: "Procurement Committee", name: "Committee", status: "approved", at: stamp(), remark: reason },
            { role: "Director Procurement", name: "Usman Zafar", status: "pending", roleKey: "director" },
          ],
        });
      });
      get().log("Blacklisting proposed", `${v.name}: ${period}.`, "Vendor Control", reason);
      return { ok: true, title: "Proposal submitted", message: `${v.name} is excluded from new RFQs until decided.` };
    },

    openEnvelopes: () => { set((s) => { s.vaultOpen = true; }); get().log("Financial envelopes opened", "Tender 089: opened in the presence of the committee.", "Bid Evaluation"); },
    toggleRfqVendor: (id, on) => set((s) => { const sel = new Set(s.rfqState.selected); if (on) sel.add(id); else sel.delete(id); s.rfqState.selected = [...sel]; }),
    dispatchRfq: () => {
      set((s) => { s.rfqState.dispatched = true; });
      const n = get().rfqState.selected.length;
      get().log("RFQ dispatched", `${get().rfq.id} emailed to ${n} vendors.`, "Sourcing");
      return { ok: true, title: "RFQ sent", message: `${get().rfq.id} emailed to ${n} vendors.` };
    },
    receiveQuote: () => set((s) => {
      const next = s.rfq.quoteBook.find((b) => s.rfqState.selected.includes(b.vendorId) && !s.rfqState.quotes.some((q) => q.vendorId === b.vendorId));
      if (next) s.rfqState.quotes.push({ ...next, at: stamp() });
    }),
    addSbdComment: (text) => set((s) => { s.sbdComments.push({ by: s.roles[s.role].user, role: s.roles[s.role].label, at: stamp(), text }); }),
    lockSbd: () => { set((s) => { s.sbdLocked = true; }); get().log("Bidding document locked", "SBD v4.2-PCB-089 signed off and locked.", "Sourcing"); },
    releaseGuarantee: (i) => { set((s) => { s.guarantees[i].status = "Released"; }); get().log("Bid security released", get().guarantees[i].instrument, "Sourcing"); },
    scheduleReport: (r) => {
      const next = ({ Weekly: "20-Oct-2026 07:00", Monthly: "01-Nov-2026 07:00", Quarterly: "01-Jan-2027 07:00", Annual: "01-Jul-2027 07:00" } as Record<string, string>)[r.freq];
      set((s) => { s.scheduled.unshift({ ...r, next }); });
      return { ok: true, title: "Report scheduled", message: `Next delivery ${next}.` };
    },
  }))
);

/* Side effects when an approval chain completes */
function onApprovalComplete(id: string) {
  const { log } = useApp.getState();
  const a = useApp.getState().approvals.find((x) => x.id === id)!;
  useApp.setState((s) => {
    if (id === "APR-2026-0186") {
      s.t089.ita = true;
      s.tenders[0].currentStage = "Intention to Award (standstill)";
      s.intentions.unshift({ tender: "PCB/LOG-PSL10/2026/089", title: "LED floodlights, Gaddafi Stadium", bidder: "Signify Pakistan Ltd", published: TODAY_STR, expires: "23-Oct-2026 17:00", days: 10, elapsed: 0 });
    }
    if (a.type === "Vendor Blacklisting") {
      const v = s.vendors.find((x) => x.id === a.ref);
      if (v) { v.status = "Blacklisted"; v.until = "13-Oct-2028"; }
    }
    if (a.type === "Purchase Requisition") {
      const d = s.demands.find((x) => x.pr === a.ref || x.id === a.demandId);
      if (d) d.status = "PR approved, sent to sourcing";
    }
  });
  if (id === "APR-2026-0186") log("Intention to Award published", "Tender 089: 10-day standstill started.", "PPRA Compliance", "Notice posted on PCB and PPRA websites. Standstill ends 23-Oct-2026 17:00.");
  if (a.type === "Vendor Blacklisting") log("Vendor blacklisted", `${a.ref} debarred and excluded from invitations.`, "Vendor Control");
  if (a.type === "Item Code Request") log("Item code activated", `${a.ref} added to the catalogue.`, "Item Master");
}

/* ---------- Selectors ---------- */
export const useRole = () => useApp((s) => s.roles[s.role]);
export const canAccess = (role: Role, tab: string) => role.tabs === "all" || role.tabs.includes(tab === "sourcing" ? "tenders" : tab);

export function tenderGates(s: AppState) {
  const a = s.approvals.find((x) => x.id === "APR-2026-0186");
  const grvOpen = s.grievances.some((g) => g.tender === "PCB/LOG-PSL10/2026/089" && !g.status.startsWith("Closed"));
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
