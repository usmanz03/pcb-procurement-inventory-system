"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, BadgeCheck, Banknote, BookOpen, ClipboardList, Gavel, PackageCheck, QrCode, Recycle, ShoppingCart, Trash2, UserCheck, Warehouse, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Section, Stat, Status } from "@/components/dash";
import { QrLabelDialog } from "@/components/qr-label";
import { useApp } from "@/lib/store";
import { computeLedger, FAR_FUTURE, num, parseD, pkr } from "@/lib/domain";
import { cn } from "@/lib/utils";

type Stage = "Catalogued" | "Demanded" | "Approved" | "Sourced" | "Ordered" | "Received" | "Issued" | "Paid" | "Disposed";
const STAGES: { key: Stage; icon: LucideIcon }[] = [
  { key: "Catalogued", icon: BookOpen }, { key: "Demanded", icon: ClipboardList }, { key: "Approved", icon: BadgeCheck }, { key: "Sourced", icon: Gavel },
  { key: "Ordered", icon: ShoppingCart }, { key: "Received", icon: PackageCheck }, { key: "Issued", icon: UserCheck }, { key: "Paid", icon: Banknote }, { key: "Disposed", icon: Trash2 },
];
interface Ev { date: string; stage: Stage; title: string; detail: string; ref?: string; icon: LucideIcon; tone: "primary" | "gold" | "success" | "warning" | "danger" | "muted" }

export default function TracePage() {
  return <Suspense><Trace /></Suspense>;
}

function Trace() {
  const s = useApp();
  const params = useSearchParams();
  const router = useRouter();
  const fromQr = params.get("code");
  const tagHolder = fromQr ? s.custodyHolders.find((h) => h.assets.some((a) => a.assetTag === fromQr)) : undefined;
  const tagAsset = tagHolder?.assets.find((a) => a.assetTag === fromQr);
  const code = tagAsset?.itemCode && s.itemsMaster.some((i) => i.code === tagAsset.itemCode) ? tagAsset.itemCode : s.itemsMaster.some((i) => i.code === fromQr) ? fromQr! : "PCB-INF-LGT-0018";
  const item = s.itemsMaster.find((i) => i.code === code)!;
  const [qr, setQr] = useState(false);

  const { events, done } = useMemo(() => {
    const ev: Ev[] = [];
    const L = s.itemLedgers[code];
    ev.push({ date: L?.opening.date ?? "01-Jul-2026", stage: "Catalogued", title: "Registered in the item catalogue", detail: `${item.category} · ${item.subCategory} · ${item.budgetType} · ${item.classification.includes("Asset") ? "tracked asset" : "consumable"}${L ? ` · opening stock ${L.opening.qty} ${item.uom.toLowerCase()}` : ""}`, ref: code, icon: BookOpen, tone: "muted" });
    const demands = s.demands.filter((d) => d.itemCode === code);
    demands.forEach((d) => {
      ev.push({ date: d.date, stage: "Demanded", title: `Demand by ${d.dept}`, detail: `${d.qty} requested by ${d.by} for “${d.purpose}”${d.issued ? ` · ${d.issued} given from stock` : ""}${d.prQty ? ` · ${d.prQty} sent to Procurement` : ""}`, ref: d.id, icon: ClipboardList, tone: "primary" });
      const a = s.approvals.find((x) => x.ref === d.pr || x.demandId === d.id);
      a?.chain.filter((c) => c.status === "approved" && c.at && c.roleKey).forEach((c) => ev.push({ date: d.date, stage: "Approved", title: `Approved by ${c.role}`, detail: `${c.name}: ${c.remark ?? "Approved."}`, ref: a.id, icon: BadgeCheck, tone: "success" }));
    });
    if (code === "PCB-INF-LGT-0018") {
      const t = s.tenders[0];
      ev.push({ date: t.publishDate, stage: "Sourced", title: "Tender advertised", detail: `${t.title} · ${t.method}`, ref: t.tenderId, icon: Gavel, tone: "gold" });
      ev.push({ date: t.techOpeningDate, stage: "Sourced", title: "Technical bids opened", detail: `${t.bidders.length} bidders · committee of ${t.committee.length}, all declared no conflict of interest`, ref: t.tenderId, icon: Gavel, tone: "gold" });
      ev.push({ date: t.finOpeningDate, stage: "Sourced", title: "Price bids opened and ranked", detail: `Lowest evaluated: ${t.bidders.find((b) => b.isWinner)?.name ?? "—"}`, ref: t.tenderId, icon: Gavel, tone: "gold" });
      const a = s.approvals.find((x) => x.id === "APR-2026-0186");
      a?.chain.filter((c) => c.status === "approved" && c.roleKey).forEach((c) => ev.push({ date: a.submitted, stage: "Approved", title: `Award approved by ${c.role}`, detail: `${c.name}: ${c.remark ?? ""}`, ref: a.id, icon: BadgeCheck, tone: "success" }));
    }
    if (s.rfq.itemCode === code) {
      if (s.rfqState.dispatched) ev.push({ date: s.rfq.closes, stage: "Sourced", title: "Quotations invited", detail: `${s.rfqState.selected.length} vendors invited, ${s.rfqState.quotes.length} quoted`, ref: s.rfq.id, icon: Gavel, tone: "gold" });
    }
    const pos = s.purchaseOrders.filter((p) => p.itemCode === code);
    pos.forEach((p) => {
      ev.push({ date: p.date, stage: "Ordered", title: `Purchase order to ${p.vendor}`, detail: `${p.qty} at ${pkr(p.unitPrice)} each · delivery by ${p.due}`, ref: p.po, icon: ShoppingCart, tone: "primary" });
      s.invoices.filter((i) => i.po === p.po && i.status === "Paid").forEach((i) => ev.push({ date: i.received, stage: "Paid", title: `Vendor paid`, detail: `${i.vendor} · ${pkr(i.base * 1.18 - i.base * 0.045)} net after tax · ${i.paidRef}`, ref: i.inv, icon: Banknote, tone: "success" }));
    });
    L?.entries.forEach((e) => {
      if (e.type === "GRN") ev.push({ date: e.date, stage: "Received", title: `Received ${e.qty} into store`, detail: `From ${e.party} at ${pkr(e.unitCost ?? 0)} each · inspected and accepted`, ref: e.ref, icon: PackageCheck, tone: "success" });
      if (e.type === "ISSUE") ev.push({ date: e.date, stage: "Issued", title: `Issued ${-e.qty} to ${e.party}`, detail: `${e.recipient ? `Received by ${e.recipient}` : ""}${e.custodian ? ` · custodian ${e.custodian}` : ""} · ${e.purpose}`, ref: e.ref, icon: ArrowUpRight, tone: "primary" });
      if (e.type === "RETURN") ev.push({ date: e.date, stage: "Issued", title: `${e.qty} returned to store`, detail: `${e.party} · ${e.purpose}`, ref: e.ref, icon: ArrowDownLeft, tone: "muted" });
      if (e.type === "TRANSFER_OUT" || e.type === "TRANSFER_IN") ev.push({ date: e.date, stage: "Received", title: e.type === "TRANSFER_OUT" ? `${-e.qty} sent to ${e.party}` : `${e.qty} received from ${e.party}`, detail: e.purpose, ref: e.ref, icon: Warehouse, tone: "muted" });
      if (e.type === "ADJUST") ev.push({ date: e.date, stage: "Received", title: `Stock count adjustment ${e.qty > 0 ? "+" : ""}${e.qty}`, detail: e.purpose, ref: e.ref, icon: Recycle, tone: "warning" });
    });
    s.custodyHolders.forEach((h) => h.assets.filter((a) => a.itemCode === code).forEach((a) => {
      const m = s.custodyMeta[a.assetTag];
      ev.push({ date: a.issuedDate, stage: "Issued", title: `In the hands of ${h.name}`, detail: `${h.designation} · ${m?.purpose ?? ""} · ${m?.location ?? ""} · ${m?.ack === "Pending" ? "awaiting their confirmation" : "receipt confirmed"}`, ref: a.assetTag, icon: UserCheck, tone: "gold" });
    }));
    s.disposals.filter((d) => d.itemCode === code).forEach((d) => ev.push({ date: d.decidedOn ?? d.date, stage: "Disposed", title: d.status === "Written off" ? "Written off" : d.status === "Approved for auction" ? "Approved for auction" : `Disposal ${d.status.toLowerCase()}`, detail: `${d.assetTag} · ${d.reason}`, ref: d.id, icon: Trash2, tone: "danger" }));
    ev.sort((a, b) => parseD(a.date).getTime() - parseD(b.date).getTime());
    return { events: ev, done: new Set(ev.map((e) => e.stage)) };
  }, [s, code, item]);

  const L = s.itemLedgers[code];
  const close = L ? computeLedger(L, new Date(2000, 0, 1), FAR_FUTURE).close : null;
  const holders = s.custodyHolders.flatMap((h) => h.assets.filter((a) => a.itemCode === code).map((a) => ({ h, a })));

  return (
    <>
      <PageHeader module="Traceability" title="Track an item, start to finish" description="Choose an item, or scan its label, to see every step it has taken: who asked for it, who approved it, who supplied it, where it is now and who holds it."
        actions={<>
          <Select value={code} onValueChange={(v) => router.replace(`/trace/?code=${v}`, { scroll: false })}>
            <SelectTrigger className="w-[min(22rem,80vw)]"><SelectValue /></SelectTrigger>
            <SelectContent>{s.itemsMaster.map((i) => <SelectItem key={i.code} value={i.code}><span className="font-mono text-xs">{i.code}</span> <span className="text-muted-foreground">{i.name.slice(0, 34)}</span></SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setQr(true)}><QrCode /> Label</Button>
        </>} />

      {tagAsset && <div className="mb-4 rounded-xl border border-gold/50 bg-gold/10 px-4 py-3 text-sm"><b>{tagAsset.assetTag}</b> · {tagAsset.description} · held by <b>{tagHolder?.name}</b></div>}

      <Section className="mb-6 overflow-hidden" title={item.name} description={`${item.code} · ${item.category} · ${item.budgetType} · ${item.classification.includes("Asset") ? "Tracked asset" : "Consumable"}`}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="In stock, all stores" value={num(item.totalStock)} sub={item.uom} />
          <Stat label="Value on hand" value={pkr((close?.qty ?? item.totalStock) * item.avgCostPkr)} sub="At average cost" />
          <Stat label="Average cost" value={pkr(item.avgCostPkr)} sub="Updated on every receipt" />
          <Stat label="With employees" value={holders.length} sub={holders.length ? holders.map((x) => x.h.name.split(" ")[0]).slice(0, 3).join(", ") : "None issued"} />
        </div>
        <div className="mt-6 overflow-x-auto pb-1">
          <ol className="mx-auto flex min-w-[720px] items-start justify-between gap-1">
            {STAGES.map((st, i) => {
              const on = done.has(st.key);
              return (
                <li key={st.key} className="relative flex flex-1 flex-col items-center gap-2 text-center">
                  {i < STAGES.length - 1 && <span className={cn("absolute top-5 left-1/2 h-0.5 w-full", on && done.has(STAGES[i + 1].key) ? "bg-primary" : "bg-border")} />}
                  <motion.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: i * 0.06 }}
                    className={cn("relative z-10 flex size-10 items-center justify-center rounded-full border-2", on ? "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px] shadow-primary/15" : "border-border bg-card text-muted-foreground")}>
                    <st.icon className="size-4" />
                  </motion.span>
                  <span className={cn("text-[11px] font-medium", on ? "text-foreground" : "text-muted-foreground")}>{st.key}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Section title="The full story" description={`${events.length} recorded steps, oldest first.`} className="self-start">
          <ol className="relative">
            {events.map((e, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                {i < events.length - 1 && <span className="absolute top-9 bottom-0 left-[17px] w-px bg-border" />}
                <span className={cn("flex size-9 items-center justify-center rounded-full border",
                  e.tone === "primary" && "border-primary/40 bg-primary/10 text-primary", e.tone === "gold" && "border-gold/50 bg-gold/12 text-gold-text",
                  e.tone === "success" && "border-success/40 bg-success/10 text-success", e.tone === "warning" && "border-warning/40 bg-warning/10 text-warning",
                  e.tone === "danger" && "border-destructive/40 bg-destructive/10 text-destructive", e.tone === "muted" && "bg-muted text-muted-foreground")}>
                  <e.icon className="size-4" />
                </span>
                <div className="min-w-0 pt-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-[13px] font-semibold">{e.title}</span>
                    <span className="text-[11px] text-muted-foreground">{e.date}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{e.detail}</p>
                  {e.ref && <span className="mt-1 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{e.ref}</span>}
                </div>
              </motion.li>
            ))}
          </ol>
        </Section>
        <div className="grid gap-6 self-start">
          <Section title="Where it is now" description="Stock by store.">
            <div className="grid gap-2.5">
              {s.stadiumStores.map((st) => {
                const q = item.storeBreakdown[st.id] ?? 0;
                const max = Math.max(1, ...Object.values(item.storeBreakdown));
                return (
                  <div key={st.id} className="grid grid-cols-[minmax(0,9rem)_1fr_3rem] items-center gap-3 text-[13px]">
                    <span className="truncate text-muted-foreground">{st.name.replace(" Central Store", "").replace(" Cricket Stadium", "").replace(" Stadium", "")}</span>
                    <span className="h-2.5 overflow-hidden rounded-full bg-muted"><motion.span className="block h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(q / max) * 100}%` }} transition={{ duration: 0.7 }} /></span>
                    <span className="text-right font-mono text-xs font-semibold tabular">{q}</span>
                  </div>
                );
              })}
            </div>
          </Section>
          <Section title="Who holds it" description="Named employees accountable for this item.">
            {holders.length ? (
              <ul className="grid gap-2">
                {holders.map(({ h, a }) => (
                  <li key={a.assetTag} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
                    <div className="min-w-0"><div className="truncate text-[13px] font-semibold">{h.name}</div><div className="truncate text-[11px] text-muted-foreground">{h.department}</div></div>
                    <Status tone={s.custodyMeta[a.assetTag]?.lifecycle === "Disposed" ? "danger" : "success"} icon={null}>{a.assetTag}</Status>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Not issued to any employee. {item.classification.includes("Asset") ? "Assets are tagged when issued." : "Consumables are issued against demands."}</p>}
          </Section>
        </div>
      </div>

      <QrLabelDialog code={qr ? code : null} title={item.name} sub={`${item.category} · ${item.uom}`} onClose={() => setQr(false)} />
    </>
  );
}
