/*
 * Modules 0–2: Item master & codification, demands with reservation, stores & stock-take.
 * Composed into createActions() in engine.ts and run on both server and client.
 */
import type { Draft } from "immer";
import { bandFor, computeLedger, FAR_FUTURE, fmtD, parseD, pkr, stamp, TODAY_STR } from "./domain";
import type { Approval, Item, ItemDraft, RoleKey } from "./types";
import type { EngineState, Result } from "./engine";

type Set = (recipe: (s: Draft<EngineState>) => void) => void;
type Get = () => EngineState;
type Log = (title: string, desc: string, badge: string, details?: string) => void;
const ok = (title: string, message: string, detail?: unknown): Result => ({ ok: true, title, message, detail });
const no = (title: string, message: string): Result => ({ ok: false, title, message });
const CENTRAL = "STORE-LHR-01";
const OPEN_DEMAND = (st: string) => !["Fulfilled from stock", "Cancelled", "PR rejected"].includes(st);

export interface StoreActions {
  requestItemCode: (c: Partial<ItemDraft> & { code: string; desc?: string }) => Result;
  updateItem: (code: string, p: { name?: string; spec?: string; uom?: string; reorderLevel?: number; shelfLife?: string; subCategory?: string }) => Result;
  requestDeactivation: (code: string, reason: string) => Result;
  reactivateItem: (code: string) => Result;
  mapLegacyCode: (code: string, legacy: string) => Result;
  submitDemand: (d: { dept: string; itemCode: string; qty: number; requiredBy: string; purpose: string; budgetHead: string }) => Result;
  issueDemand: (id: string) => Result;
  updateDemand: (id: string, p: { requiredBy?: string; purpose?: string; budgetHead?: string }) => Result;
  cancelDemand: (id: string, reason: string) => Result;
  addStore: (v: { name: string; city: string; type: string; custodian: string }) => Result;
  updateStore: (id: string, v: { name?: string; custodian?: string; type?: string }) => Result;
  setStoreStatus: (id: string, status: "Active" | "Inactive") => Result;
  returnToStore: (v: { code: string; qty: number; dept: string; reason: string }) => Result;
  startStockTake: (storeId: string) => Result;
  saveCounts: (id: string, counts: Record<string, number | null>) => Result;
  submitStockTake: (id: string) => Result;
  approveStockTake: (id?: string) => Result;
  cancelStockTake: (id: string) => Result;
}

export const STORE_ACTION_TAB: Record<keyof StoreActions, string> = {
  requestItemCode: "items", updateItem: "items", requestDeactivation: "items", reactivateItem: "items", mapLegacyCode: "items",
  submitDemand: "inventory", issueDemand: "inventory", updateDemand: "inventory", cancelDemand: "inventory",
  addStore: "inventory", updateStore: "inventory", setStoreStatus: "inventory", returnToStore: "inventory",
  startStockTake: "inventory", saveCounts: "inventory", submitStockTake: "inventory", approveStockTake: "inventory", cancelStockTake: "inventory",
};

export const CATEGORY_NAMES: Record<string, string> = {
  SPO: "Sports Equipment", INF: "Infrastructure & Stadium Works", TRF: "Turf & Grounds Equipment", APP: "Apparel & Kits",
  MED: "Medical & Sports Science", BRD: "Broadcast & Technology", STA: "Stationery & Office", ITE: "IT Equipment",
};

export const available = (i: Item) => Math.max(0, (i.storeBreakdown[CENTRAL] ?? 0) - (i.reserved ?? 0));
export const isActive = (i: Item) => (i.status ?? "Active") === "Active";

export function createStoreActions(set: Set, get: Get, log: Log, nextApr: () => string): StoreActions & { _approved: (a: Approval) => void; _rejected: (a: Approval) => void } {
  const user = () => get().roles[get().role].user;
  const can = (...roles: RoleKey[]) => roles.includes(get().role);
  const note = (text: string) => ({ at: stamp(), by: user(), text });

  return {
    /* ---------- Module 0: Item master & codification ---------- */
    requestItemCode: (c) => {
      const st = get();
      const name = (c.name ?? c.desc ?? "").trim();
      if (!name) return no("Description required", "Describe the item.");
      if (st.itemsMaster.some((i) => i.code === c.code || i.legacyCodes?.includes(c.code)) || st.approvals.some((a) => a.type === "Item Code Request" && a.ref === c.code && a.status === "pending"))
        return no("Code in use", `${c.code} already exists or is awaiting approval. Codes are never reused.`);
      const dup = st.itemsMaster.find((i) => i.name.toLowerCase() === name.toLowerCase());
      if (dup) return no("Duplicate item", `${dup.code} already has this exact description.`);
      const [, cat = "SPO", sub = ""] = c.code.split("-");
      const draft: ItemDraft = {
        code: c.code, name, category: c.category ?? CATEGORY_NAMES[cat] ?? cat, categoryCode: c.categoryCode ?? cat, subCategory: c.subCategory ?? sub,
        nature: c.nature ?? "Consumable", exp: c.exp ?? "OpEx", uom: c.uom ?? "Unit", reorder: c.reorder ?? 10, spec: c.spec ?? "",
        shelfLife: c.shelfLife, warranty: c.warranty, usefulLife: c.usefulLife, depreciation: c.depreciation, dupOf: c.dupOf,
      };
      const id = nextApr();
      set((s) => {
        s.approvals.unshift({
          id, type: "Item Code Request", ref: c.code, title: `New code: ${name}`, amount: null, band: "—", dept: "Catalogue", requestedBy: user(), submitted: TODAY_STR, slaHours: 24, elapsedHours: 0, status: "pending",
          payload: draft as unknown as Record<string, unknown>,
          chain: [
            { role: "Catalogue Officer", name: "Saima Khan", status: "approved", at: stamp(), remark: draft.dupOf ? `Similar to ${draft.dupOf}; reviewed and distinct.` : "Checked: no duplicate found." },
            { role: "Director Procurement", name: "Usman Zafar", status: "pending", roleKey: "director" },
          ],
        });
      });
      log("Item code requested", `${c.code}: ${name}.`, "Item Master", `${draft.nature}, ${draft.exp}, ${draft.uom}. Routed as ${id}.`);
      return ok("Code sent for approval", `${c.code} routed to the Director as ${id}.`, { approval: id });
    },

    updateItem: (code, p) => {
      if (!can("director", "storekeeper")) return no("Not permitted", "Item records are maintained by the Director or Central Storekeeper.");
      const it = get().itemsMaster.find((i) => i.code === code);
      if (!it) return no("Unknown item", code);
      if (p.name !== undefined && !p.name.trim()) return no("Description required", "The item needs a description.");
      if (p.reorderLevel !== undefined && (p.reorderLevel < 0 || !Number.isFinite(p.reorderLevel))) return no("Check re-order level", "Use zero or more.");
      const changed = (Object.keys(p) as (keyof typeof p)[]).filter((k) => p[k] !== undefined && String(p[k]) !== String(k === "reorderLevel" ? it.reorderLevel : (it as unknown as Record<string, unknown>)[k]));
      if (!changed.length) return no("No changes", "Nothing was changed.");
      set((s) => {
        const x = s.itemsMaster.find((i) => i.code === code)!;
        if (p.name !== undefined) x.name = p.name.trim();
        if (p.spec !== undefined) x.spec = p.spec;
        if (p.uom !== undefined) x.uom = p.uom;
        if (p.reorderLevel !== undefined) x.reorderLevel = p.reorderLevel;
        if (p.shelfLife !== undefined) x.shelfLife = p.shelfLife;
        if (p.subCategory !== undefined) x.subCategory = p.subCategory;
      });
      log("Item record updated", `${code}: ${changed.join(", ")} changed.`, "Item Master", changed.map((k) => `${k}: ${String(k === "reorderLevel" ? it.reorderLevel : (it as unknown as Record<string, unknown>)[k])} → ${String(p[k])}`).join("; "));
      return ok("Item updated", `${code} saved. The previous values are kept in the activity record.`);
    },

    requestDeactivation: (code, reason) => {
      const st = get();
      const it = st.itemsMaster.find((i) => i.code === code);
      if (!it) return no("Unknown item", code);
      if (!isActive(it)) return no("Not active", `${code} is ${it.status?.toLowerCase()}.`);
      if (!reason.trim()) return no("Reason required", "Say why the code is being retired.");
      if (it.totalStock > 0) return no("Stock on hand", `${it.totalStock} ${it.uom.toLowerCase()} are still in stores. Issue, transfer or dispose of them first.`);
      const open = st.demands.filter((d) => d.itemCode === code && OPEN_DEMAND(d.status));
      if (open.length) return no("Open demands", `${open.map((d) => d.id).join(", ")} still reference this code.`);
      const id = nextApr();
      set((s) => {
        s.itemsMaster.find((i) => i.code === code)!.status = "Deactivation pending";
        s.approvals.unshift({
          id, type: "Item Code Deactivation", ref: code, title: `Retire code: ${it.name.slice(0, 50)}`, amount: null, band: "—", dept: "Catalogue", requestedBy: user(), submitted: TODAY_STR, slaHours: 24, elapsedHours: 0, status: "pending",
          chain: [
            { role: "Catalogue Officer", name: "Saima Khan", status: "approved", at: stamp(), remark: reason },
            { role: "Director Procurement", name: "Usman Zafar", status: "pending", roleKey: "director" },
          ],
        });
      });
      log("Code deactivation requested", `${code}: ${reason}`, "Item Master", `Routed as ${id}. The code stays reserved and is never reused.`);
      return ok("Deactivation sent for approval", `${code} routed as ${id}. No new demands can be raised meanwhile.`);
    },

    reactivateItem: (code) => {
      if (!can("director")) return no("Not permitted", "Only the Director can reactivate a code.");
      const it = get().itemsMaster.find((i) => i.code === code);
      if (!it || it.status !== "Inactive") return no("Not inactive", `${code} is already active.`);
      set((s) => { s.itemsMaster.find((i) => i.code === code)!.status = "Active"; });
      log("Item code reactivated", `${code} is available for demands again.`, "Item Master");
      return ok("Code reactivated", `${code} is active again.`);
    },

    mapLegacyCode: (code, legacy) => {
      const l = legacy.trim().toUpperCase();
      if (!l) return no("Legacy code required", "Enter the old code.");
      const owner = get().itemsMaster.find((i) => i.code === l || i.legacyCodes?.includes(l));
      if (owner) return no("Already mapped", `${l} belongs to ${owner.code}.`);
      set((s) => { const x = s.itemsMaster.find((i) => i.code === code)!; x.legacyCodes = [...(x.legacyCodes ?? []), l]; });
      log("Legacy code mapped", `${l} → ${code}.`, "Data Migration", "Old records under the legacy code now trace to the new Item Code.");
      return ok("Legacy code mapped", `${l} now points to ${code}.`);
    },

    /* ---------- Module 1: Demand with stock branching and reservation ---------- */
    submitDemand: (d) => {
      const st = get();
      const item = st.itemsMaster.find((i) => i.code === d.itemCode);
      if (!item) return no("Unknown item", d.itemCode);
      if (!isActive(item)) return no("Code not active", `${item.code} is ${item.status?.toLowerCase()} and cannot be demanded.`);
      if (!Number.isInteger(d.qty) || d.qty < 1) return no("Check quantity", "Quantity must be a whole number of at least 1.");
      if (!d.purpose.trim()) return no("Purpose required", "State the purpose of the demand.");
      const reserve = Math.min(available(item), d.qty), prQty = d.qty - reserve;
      const prValue = prQty * item.avgCostPkr;
      const head = st.budgetHeads.find((b) => b.id === d.budgetHead);
      if (prQty && head && prValue > head.allocation - head.committed) return no("Insufficient budget", `${head.name} has ${pkr(head.allocation - head.committed)} uncommitted; this needs ${pkr(prValue)}.`);
      const id = `REQ-2026-${st.seq.demand}`;
      const pr = prQty ? `PR-AUTO-${st.seq.pr}` : null;
      const band = bandFor(prValue);
      const apr = prQty ? `APR-2026-0${st.seq.apr}` : null;
      const status = prQty === 0 ? "Reserved, awaiting issue" : reserve ? "Part reserved, balance in approval" : "PR in approval";
      set((s) => {
        s.seq.demand++; if (prQty) { s.seq.pr++; s.seq.apr++; }
        const it = s.itemsMaster.find((i) => i.code === d.itemCode)!;
        it.reserved = (it.reserved ?? 0) + reserve;
        const tl = [note(`Raised for ${d.qty} ${item.uom.toLowerCase()}`), note(`Stock checked: ${available(item)} available at Gaddafi Central`)];
        if (reserve) tl.push(note(`${reserve} reserved for this demand`));
        if (prQty) tl.push(note(`${prQty} sent to Procurement as ${pr} (${apr})`));
        s.demands.unshift({ id, date: TODAY_STR, dept: d.dept, by: s.roles[s.role].user, itemCode: d.itemCode, qty: d.qty, issued: 0, reserved: reserve, prQty, branch: prQty === 0 ? "full" : reserve === 0 ? "none" : "partial", sin: null, pr, requiredBy: d.requiredBy, purpose: d.purpose, budgetHead: d.budgetHead, status, timeline: tl });
        if (prQty) {
          s.approvals.unshift({
            id: apr!, type: "Purchase Requisition", ref: pr!, title: `${prQty} × ${item.name.slice(0, 50)}`, amount: prValue, band, dept: d.dept, requestedBy: s.roles[s.role].user, submitted: TODAY_STR, slaHours: 48, elapsedHours: 0, status: "pending", demandId: id,
            chain: [
              { role: "Head of Department", name: "Department head", status: "approved", at: stamp(), remark: d.purpose },
              { role: "Director Procurement", name: "Usman Zafar", status: "pending", roleKey: "director" },
              ...(["B3", "B4", "B5"].includes(band) ? [{ role: "CFO", name: "Tariq Mehmood", status: "waiting" as const, roleKey: "cfo" as const }] : []),
            ],
          });
        }
      });
      log("Demand raised", `${id}: ${d.qty} × ${d.itemCode}${reserve ? `, ${reserve} reserved` : ""}${prQty ? `, ${prQty} to ${pr}` : ""}.`, "Auto Branching", `Purpose: ${d.purpose}.`);
      return ok("Demand submitted", `${id}${reserve ? ` · ${reserve} reserved in store` : ""}${pr ? ` · ${pr} sent for approval` : ""}`, { id, reserve, prQty, pr });
    },

    issueDemand: (id) => {
      if (!can("storekeeper", "director")) return no("Not permitted", "Stores issues are made by the Central Storekeeper.");
      const st = get();
      const d = st.demands.find((x) => x.id === id);
      if (!d || !(d.reserved ?? 0)) return no("Nothing to issue", "No stock is reserved for this demand.");
      const item = st.itemsMaster.find((i) => i.code === d.itemCode)!;
      const q = d.reserved!;
      if ((item.storeBreakdown[CENTRAL] ?? 0) < q) return no("Stock short", "The store balance is below the reserved quantity. Run a stock-take.");
      const sin = `SIN-LHR-${st.seq.sin}`;
      set((s) => {
        s.seq.sin++;
        const it = s.itemsMaster.find((i) => i.code === d.itemCode)!;
        it.storeBreakdown[CENTRAL] -= q; it.centralStock -= q; it.totalStock -= q; it.reserved = Math.max(0, (it.reserved ?? 0) - q);
        s.itemLedgers[d.itemCode]?.entries.push({ date: TODAY_STR, type: "ISSUE", ref: sin, doc: d.id, qty: -q, party: d.dept, custodian: "Departmental custodian", recipient: d.by, purpose: d.purpose });
        const x = s.demands.find((y) => y.id === id)!;
        x.issued += q; x.reserved = 0; x.sin = sin;
        x.status = x.prQty ? (x.status.includes("approved") ? "Issued; balance with sourcing" : "Issued; balance in approval") : "Fulfilled from stock";
        (x.timeline ??= []).push(note(`${q} issued from store under ${sin}`));
      });
      log("Stores issue posted", `${sin}: ${q} × ${d.itemCode} to ${d.dept} against ${d.id}.`, "Inventory", "Reservation released and stock ledger updated.");
      return ok("Issued from store", `${sin}: ${q} handed to ${d.dept}.`, { sin });
    },

    updateDemand: (id, p) => {
      const d = get().demands.find((x) => x.id === id);
      if (!d) return no("Unknown demand", id);
      if (!OPEN_DEMAND(d.status)) return no("Demand closed", `${id} is ${d.status.toLowerCase()} and can no longer be edited.`);
      if (d.by !== user() && !can("director")) return no("Not permitted", "Only the requester or the Director can edit a demand.");
      if (p.purpose !== undefined && !p.purpose.trim()) return no("Purpose required", "The purpose cannot be empty.");
      const changes = [p.requiredBy !== undefined && p.requiredBy !== d.requiredBy && `required by ${d.requiredBy} → ${p.requiredBy}`, p.purpose !== undefined && p.purpose !== d.purpose && `purpose updated`, p.budgetHead !== undefined && p.budgetHead !== d.budgetHead && `budget head ${d.budgetHead} → ${p.budgetHead}`].filter(Boolean) as string[];
      if (!changes.length) return no("No changes", "Nothing was changed.");
      set((s) => {
        const x = s.demands.find((y) => y.id === id)!;
        if (p.requiredBy !== undefined) x.requiredBy = p.requiredBy;
        if (p.purpose !== undefined) x.purpose = p.purpose;
        if (p.budgetHead !== undefined) x.budgetHead = p.budgetHead;
        (x.timeline ??= []).push(note(`Edited: ${changes.join("; ")}`));
      });
      log("Demand amended", `${id}: ${changes.join("; ")}.`, "Auto Branching");
      return ok("Demand updated", `${id} saved.`);
    },

    cancelDemand: (id, reason) => {
      const st = get();
      const d = st.demands.find((x) => x.id === id);
      if (!d) return no("Unknown demand", id);
      if (!OPEN_DEMAND(d.status)) return no("Demand closed", `${id} is already ${d.status.toLowerCase()}.`);
      if (d.by !== user() && !can("director")) return no("Not permitted", "Only the requester or the Director can cancel a demand.");
      if (!reason.trim()) return no("Reason required", "Say why the demand is cancelled.");
      const apr = st.approvals.find((a) => a.demandId === id && a.status === "pending");
      set((s) => {
        const x = s.demands.find((y) => y.id === id)!;
        const it = s.itemsMaster.find((i) => i.code === x.itemCode);
        if (it && x.reserved) it.reserved = Math.max(0, (it.reserved ?? 0) - x.reserved);
        const released = x.reserved ?? 0;
        x.reserved = 0; x.status = x.issued ? "Fulfilled from stock" : "Cancelled"; x.cancelReason = reason;
        (x.timeline ??= []).push(note(`Cancelled: ${reason}${released ? ` · ${released} released back to stock` : ""}`));
        if (apr) {
          const a = s.approvals.find((y) => y.id === apr.id)!;
          a.status = "rejected";
          const step = a.chain.find((c) => c.status === "pending");
          if (step) { step.status = "rejected"; step.at = stamp(); step.remark = `Withdrawn by requester: ${reason}`; }
        }
      });
      log("Demand cancelled", `${id}: ${reason}.`, "Auto Branching", `${d.reserved ? `${d.reserved} released back to available stock. ` : ""}${apr ? `${apr.id} withdrawn.` : ""}`);
      return ok("Demand cancelled", `${id} closed.${d.reserved ? ` ${d.reserved} returned to available stock.` : ""}`);
    },

    /* ---------- Module 2: Stores ---------- */
    addStore: (v) => {
      if (!can("director", "storekeeper")) return no("Not permitted", "Stores are set up by the Director or Central Storekeeper.");
      if (!v.name.trim() || !v.city.trim() || !v.custodian.trim()) return no("Details required", "Name, city and custodian are required.");
      const st = get();
      if (st.stadiumStores.some((x) => x.name.toLowerCase() === v.name.trim().toLowerCase())) return no("Store exists", `${v.name} is already set up.`);
      const prefix = `STORE-${v.city.trim().slice(0, 3).toUpperCase()}-`;
      const n = st.stadiumStores.filter((x) => x.id.startsWith(prefix)).length + 1;
      const id = `${prefix}${String(n).padStart(2, "0")}`;
      set((s) => {
        s.stadiumStores.push({ id, name: v.name.trim(), city: v.city.trim(), type: v.type, totalSkus: 0, valuationPkr: 0, custodian: v.custodian.trim(), ...({ capacityUsed: "0%", lastAudit: "—", status: "Active" } as object) } as never);
        s.itemsMaster.forEach((i) => { i.storeBreakdown[id] = 0; });
      });
      log("Store added", `${id}: ${v.name} (${v.type}), custodian ${v.custodian}.`, "Inventory", "Joins the single stock ledger immediately.");
      return ok("Store added", `${v.name} is live as ${id}.`, { id });
    },

    updateStore: (id, v) => {
      if (!can("director", "storekeeper")) return no("Not permitted", "Stores are maintained by the Director or Central Storekeeper.");
      const x = get().stadiumStores.find((s) => s.id === id);
      if (!x) return no("Unknown store", id);
      const changes = [v.name && v.name !== x.name && `name → ${v.name}`, v.custodian && v.custodian !== x.custodian && `custodian ${x.custodian} → ${v.custodian}`, v.type && v.type !== x.type && `type → ${v.type}`].filter(Boolean) as string[];
      if (!changes.length) return no("No changes", "Nothing was changed.");
      set((s) => { const y = s.stadiumStores.find((z) => z.id === id)!; if (v.name) y.name = v.name; if (v.custodian) y.custodian = v.custodian; if (v.type) y.type = v.type; });
      log("Store updated", `${id}: ${changes.join("; ")}.`, "Inventory");
      return ok("Store updated", `${id} saved.`);
    },

    setStoreStatus: (id, status) => {
      if (!can("director")) return no("Not permitted", "Only the Director can open or close a store.");
      if (id === CENTRAL) return no("Central store", "The central store cannot be closed.");
      const st = get();
      const held = st.itemsMaster.reduce((a, i) => a + (i.storeBreakdown[id] ?? 0), 0);
      if (status === "Inactive" && held > 0) return no("Stock on hand", `${held} units are still held here. Transfer them out first.`);
      set((s) => { (s.stadiumStores.find((z) => z.id === id) as unknown as { status: string }).status = status; });
      log(status === "Inactive" ? "Store closed" : "Store reopened", `${id}.`, "Inventory");
      return ok(status === "Inactive" ? "Store closed" : "Store reopened", id);
    },

    returnToStore: (v) => {
      if (!can("storekeeper", "director")) return no("Not permitted", "Returns are received by the Central Storekeeper.");
      const it = get().itemsMaster.find((i) => i.code === v.code);
      if (!it) return no("Unknown item", v.code);
      if (!Number.isInteger(v.qty) || v.qty < 1) return no("Check quantity", "Return at least one unit.");
      if (!v.reason.trim()) return no("Reason required", "Record why the items came back.");
      const ref = `RET-LHR-0${200 + get().seq.trf}`;
      set((s) => {
        s.seq.trf++;
        const x = s.itemsMaster.find((i) => i.code === v.code)!;
        x.storeBreakdown[CENTRAL] = (x.storeBreakdown[CENTRAL] ?? 0) + v.qty; x.centralStock += v.qty; x.totalStock += v.qty;
        s.itemLedgers[v.code]?.entries.push({ date: TODAY_STR, type: "RETURN", ref, doc: v.dept, qty: v.qty, party: v.dept, purpose: v.reason });
      });
      log("Stock returned to store", `${ref}: ${v.qty} × ${v.code} from ${v.dept}.`, "Inventory", v.reason);
      return ok("Return received", `${ref}: ${v.qty} back in Gaddafi Central.`);
    },

    /* ---------- Module 2: Stock-take ---------- */
    startStockTake: (storeId) => {
      if (!can("storekeeper", "director")) return no("Not permitted", "Stock-takes are run by stores staff.");
      const st = get();
      const store = st.stadiumStores.find((x) => x.id === storeId);
      if (!store) return no("Unknown store", storeId);
      if (st.stockTakes.some((t) => t.storeId === storeId && (t.status === "Counting" || t.status === "Submitted"))) return no("Count in progress", `${store.name} already has an open stock-take.`);
      const id = `STK-2026-0${st.seq.stk}`;
      set((s) => {
        s.seq.stk++;
        s.stockTakes.unshift({ id, storeId, store: store.name, date: TODAY_STR, countedBy: s.roles[s.role].user, status: "Counting", lines: s.itemsMaster.filter(isActive).map((i) => ({ code: i.code, book: i.storeBreakdown[storeId] ?? 0, counted: null })) });
      });
      log("Stock-take started", `${id} at ${store.name}: count sheet issued for ${st.itemsMaster.filter(isActive).length} items.`, "Inventory", "Book quantities are hidden from counters until the sheet is submitted.");
      return ok("Count sheet ready", `${id} opened for ${store.name}.`, { id });
    },

    saveCounts: (id, counts) => {
      const t = get().stockTakes.find((x) => x.id === id);
      if (!t || t.status !== "Counting") return no("Not open", "This count sheet is closed.");
      if (Object.values(counts).some((v) => v !== null && (!Number.isInteger(v) || v < 0))) return no("Check counts", "Counts must be whole numbers, zero or more.");
      set((s) => { const x = s.stockTakes.find((y) => y.id === id)!; x.lines.forEach((l) => { if (l.code in counts) l.counted = counts[l.code]; }); });
      const done = get().stockTakes.find((x) => x.id === id)!.lines.filter((l) => l.counted !== null).length;
      log("Counts recorded", `${id}: ${done} of ${t.lines.length} lines counted.`, "Inventory");
      return ok("Counts saved", `${done} of ${t.lines.length} lines counted.`);
    },

    submitStockTake: (id) => {
      const t = get().stockTakes.find((x) => x.id === id);
      if (!t || t.status !== "Counting") return no("Not open", "This count sheet is closed.");
      const missing = t.lines.filter((l) => l.counted === null).length;
      if (missing) return no("Count incomplete", `${missing} line${missing === 1 ? "" : "s"} still to count.`);
      const variances = t.lines.filter((l) => l.counted !== l.book).length;
      set((s) => { s.stockTakes.find((y) => y.id === id)!.status = "Submitted"; });
      log("Stock-take submitted", `${id}: ${variances} variance${variances === 1 ? "" : "s"} for approval.`, "Inventory");
      return ok("Submitted for approval", `${variances} variance${variances === 1 ? "" : "s"} go to the Director.`);
    },

    approveStockTake: (id) => {
      const st = get();
      const t = id ? st.stockTakes.find((x) => x.id === id) : st.stockTakes.find((x) => x.status === "Submitted");
      if (!t || t.status !== "Submitted") return no("Nothing to approve", "No submitted count sheet.");
      if (!can("director")) return no("Approval required", "Stock adjustments are approved by the Director.");
      if (t.countedBy === user()) return no("Segregation of duties", "You counted this sheet, so another person must approve it.");
      let net = 0;
      set((s) => {
        const x = s.stockTakes.find((y) => y.id === t.id)!;
        x.lines.filter((l) => l.counted !== null && l.counted !== l.book).forEach((l) => {
          const v = (l.counted as number) - l.book;
          const it = s.itemsMaster.find((i) => i.code === l.code)!;
          net += v * it.avgCostPkr;
          it.totalStock += v; it.storeBreakdown[x.storeId] = (it.storeBreakdown[x.storeId] ?? 0) + v;
          if (x.storeId === CENTRAL) {
            it.centralStock += v;
            s.itemLedgers[l.code]?.entries.push({ date: TODAY_STR, type: "ADJUST", ref: x.id, doc: "Stock-take variance", qty: v, party: x.store, purpose: "Approved stock-take adjustment" });
          }
        });
        x.status = "Approved"; x.approvedBy = s.roles[s.role].user;
        const store = s.stadiumStores.find((z) => z.id === x.storeId) as unknown as { lastAudit?: string } | undefined;
        if (store) store.lastAudit = TODAY_STR;
      });
      log("Stock-take adjustment approved", `${t.id} at ${t.store}: net variance ${pkr(net)}.`, "Inventory", "Each variance posted to the ledger as a separate adjustment entry.");
      return ok("Adjustments approved", `${t.id}: net variance ${pkr(net)} posted.`);
    },

    cancelStockTake: (id) => {
      const t = get().stockTakes.find((x) => x.id === id);
      if (!t || (t.status !== "Counting" && t.status !== "Submitted")) return no("Not open", "Only open count sheets can be cancelled.");
      set((s) => { s.stockTakes.find((y) => y.id === id)!.status = "Cancelled"; });
      log("Stock-take cancelled", `${id} at ${t.store}.`, "Inventory");
      return ok("Stock-take cancelled", id);
    },

    /* ---------- Approval hooks ---------- */
    _approved: (a) => {
      if (a.type === "Item Code Request" && a.payload) {
        const p = a.payload as unknown as ItemDraft;
        if (get().itemsMaster.some((i) => i.code === p.code)) return;
        const asset = p.nature === "Non-consumable asset";
        set((s) => {
          const breakdown = Object.fromEntries(s.stadiumStores.map((x) => [x.id, 0]));
          s.itemsMaster.push({
            code: p.code, name: p.name, category: p.category, categoryCode: p.categoryCode, subCategory: p.subCategory, classification: asset ? "Non-Consumable (Asset)" : "Consumable",
            budgetType: p.exp, uom: p.uom, totalStock: 0, storeBreakdown: breakdown, centralStock: 0, reorderLevel: p.reorder, avgCostPkr: 0,
            shelfLife: asset ? "N/A (Asset)" : p.shelfLife || "—", spec: p.spec, status: "Active", reserved: 0, legacyCodes: [], createdOn: TODAY_STR,
          });
          s.itemLedgers[p.code] = { opening: { date: TODAY_STR, qty: 0, unitCost: 0 }, entries: [] };
          if (asset) s.assetAttributes[p.code] = { warranty: p.warranty || "—", usefulLife: p.usefulLife || "—", depreciation: p.depreciation || "—" };
        });
        log("Item code activated", `${p.code}: ${p.name} added to the catalogue.`, "Item Master", "Available for demands, tenders and receipts from today.");
      }
      if (a.type === "Item Code Deactivation") {
        set((s) => { const x = s.itemsMaster.find((i) => i.code === a.ref); if (x) x.status = "Inactive"; });
        log("Item code deactivated", `${a.ref} retired. The code remains reserved and its history is kept.`, "Item Master");
      }
      if (a.type === "Purchase Requisition") {
        set((s) => {
          const d = s.demands.find((x) => x.pr === a.ref || x.id === a.demandId);
          if (d) { d.status = d.issued || d.reserved ? (d.reserved ? "Reserved; balance with sourcing" : "Issued; balance with sourcing") : "PR approved, sent to sourcing"; (d.timeline ??= []).push(note(`${a.ref} fully approved, passed to sourcing`)); }
        });
      }
    },
    _rejected: (a) => {
      if (a.type === "Item Code Deactivation") set((s) => { const x = s.itemsMaster.find((i) => i.code === a.ref); if (x) x.status = "Active"; });
      if (a.type === "Purchase Requisition") set((s) => {
        const d = s.demands.find((x) => x.pr === a.ref || x.id === a.demandId);
        if (d) { d.status = d.issued || d.reserved ? d.status.replace(/balance.*/, "balance refused") : "PR rejected"; (d.timeline ??= []).push(note(`${a.ref} ${a.status === "returned" ? "returned for clarification" : "rejected"}`)); }
      });
    },
  };
}

/* Purchase history for an item from its ledger (cost history, FR-0.5) */
export function costHistory(s: Pick<EngineState, "itemLedgers">, code: string) {
  const L = s.itemLedgers[code];
  if (!L) return [];
  const all = computeLedger(L, new Date(2000, 0, 1), FAR_FUTURE).rows;
  return all.filter((r) => r.type === "GRN").map((r) => ({ date: r.date, qty: r.qty, price: r.unitCost ?? 0, vendor: r.party, ref: r.ref, po: r.doc, wac: r.wac })).sort((a, b) => parseD(a.date).getTime() - parseD(b.date).getTime());
}

export { fmtD };
