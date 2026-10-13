"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Box, Check, FileText, Mail, PackageCheck, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarList, KpiGrid, Meter, PageHeader, Section, Stat, Status, Stepper, type Tone } from "@/components/dash";
import { DocPaper, KV } from "@/components/doc";
import { tenderGates, useApp, useRole } from "@/lib/store";
import { daysBetween, mil, num, parseD, pkr, poStatus, poValue, TODAY } from "@/lib/domain";
import type { PurchaseOrder } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, Tone> = { "Fully received": "success", Overdue: "danger", "Partially received": "warning", "In transit": "info", Issued: "info" };

export default function OrdersPage() {
  return <Suspense><Orders /></Suspense>;
}

function Orders() {
  const s = useApp();
  const role = useRole();
  const params = useSearchParams();
  const router = useRouter();
  const selectedPo = params.get("po") ?? s.purchaseOrders[0].po;
  const p = s.purchaseOrders.find((x) => x.po === selectedPo) ?? s.purchaseOrders[0];
  const [gateOpen, setGateOpen] = useState(false);
  const [docPo, setDocPo] = useState<PurchaseOrder | null>(null);

  const open = s.purchaseOrders.filter((x) => x.received < x.qty);
  const overdue = open.filter((x) => parseD(x.due) < TODAY);
  const ld = overdue.reduce((a, x) => a + poValue(x) * 0.001 * daysBetween(parseD(x.due), TODAY), 0);

  return (
    <>
      <PageHeader module="Procurement" title="Purchase orders & goods receipt" description="Orders generated from approved evaluations, budget commitment on release, delivery tracking and receipt with inspection."
        actions={!role.readOnly && <Button onClick={() => (s.t089.po ? router.push("/orders/?po=PO-PCB-2026-0331") : setGateOpen(true))}><FileText /> Generate PO from approved evaluation</Button>} />

      <KpiGrid items={[
        { label: "Open order value", prefix: "PKR", value: open.reduce((a, x) => a + (x.qty - x.received) * x.unitPrice * (1 + x.taxRate), 0) / 1e6, decimals: 1, suffix: "M", icon: FileText, hero: true, foot: `${open.length} orders awaiting delivery` },
        { label: "Overdue deliveries", value: overdue.length, icon: AlertTriangle, delta: overdue.length ? { dir: "up", text: `LD accruing ${pkr(ld)}`, good: false } : { dir: "flat", text: "None" } },
        { label: "Units awaiting receipt", value: open.reduce((a, x) => a + x.qty - x.received, 0), icon: Truck, foot: "Across all open orders" },
        { label: "GRNs posted this month", value: s.grns.filter((g) => g.date.includes("Oct-2026")).length, icon: Box, foot: "Passed to Finance automatically" },
      ]} />

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Section title="Purchase order register" description="Select an order to track delivery and record goods receipt." flush className="self-start">
          <Table>
            <TableHeader><TableRow><TableHead className="pl-5">Purchase order</TableHead><TableHead className="text-right">Value incl. tax</TableHead><TableHead className="w-36">Received</TableHead><TableHead>Due</TableHead><TableHead className="pr-5">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {s.purchaseOrders.map((x) => {
                const st = poStatus(x);
                return (
                  <TableRow key={x.po} onClick={() => router.replace(`/orders/?po=${x.po}`, { scroll: false })} data-state={x.po === p.po ? "selected" : undefined} className={cn("cursor-pointer", x.po === p.po && "shadow-[inset_3px_0_0_var(--primary)]")}>
                    <TableCell className="max-w-[16rem] pl-5 whitespace-normal"><div className="font-mono text-xs font-semibold">{x.po}</div><div className="line-clamp-1 text-xs text-muted-foreground">{x.vendor} · {x.item}</div></TableCell>
                    <TableCell className="text-right font-mono text-xs tabular">{mil(poValue(x) * (1 + x.taxRate), 2)}</TableCell>
                    <TableCell><Meter value={(x.received / x.qty) * 100} tone={x.received >= x.qty ? "primary" : "warning"} /><div className="mt-1 text-[11px] text-muted-foreground tabular">{x.received} of {x.qty}</div></TableCell>
                    <TableCell className={cn("text-xs", st === "Overdue" && "font-semibold text-destructive")}>{x.due}</TableCell>
                    <TableCell className="pr-5"><Status tone={STATUS_TONE[st] ?? "neutral"} icon={st === "In transit" || st === "Partially received" ? Truck : undefined}>{st}</Status></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Section>
        <PODetail key={p.po + p.received} p={p} onDoc={() => setDocPo(p)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Goods receipt notes" description="Every receipt updates stock and average cost, and is passed to Finance." flush className="self-start">
          <Table>
            <TableHeader><TableRow><TableHead className="pl-5">GRN</TableHead><TableHead>PO</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Accepted</TableHead><TableHead className="pr-5">Inspection</TableHead></TableRow></TableHeader>
            <TableBody>{s.grns.map((g) => (
              <TableRow key={g.grn}>
                <TableCell className="pl-5 font-mono text-xs font-semibold">{g.grn}</TableCell><TableCell className="font-mono text-xs">{g.po}</TableCell><TableCell className="text-xs">{g.date}</TableCell>
                <TableCell className="text-right font-mono text-xs tabular">{g.accepted}{g.rejected ? <span className="text-destructive"> ({g.rejected} rejected)</span> : null}</TableCell>
                <TableCell className="max-w-[12rem] pr-5 whitespace-normal text-xs"><div>{g.inspector}</div><div className="text-muted-foreground">{g.remark}</div></TableCell>
              </TableRow>))}
            </TableBody>
          </Table>
        </Section>
        <Section title="On-time delivery by vendor" description="Deliveries received by the PO due date, FY to date. Feeds vendor performance." className="self-start">
          <BarList rows={s.vendors.filter((v) => v.status !== "Blacklisted").map((v) => ({ name: v.name.split(" (")[0], value: v.onTime, color: v.onTime < 80 ? "var(--chart-5)" : "var(--chart-1)" }))} format={(v) => `${v}%`} max={100} />
        </Section>
      </div>

      <GateDialog open={gateOpen} onOpenChange={setGateOpen} />
      <Dialog open={!!docPo} onOpenChange={(o) => !o && setDocPo(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader className="sr-only"><DialogTitle>Purchase order {docPo?.po}</DialogTitle><DialogDescription>Purchase order document</DialogDescription></DialogHeader>
          {docPo && <PODocument p={docPo} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function PODetail({ p, onDoc }: { p: PurchaseOrder; onDoc: () => void }) {
  const s = useApp();
  const role = useRole();
  const st = poStatus(p);
  const head = s.budgetHeads.find((b) => b.id === p.budgetHead);
  const outstanding = p.qty - p.received;
  const late = st === "Overdue" ? daysBetween(parseD(p.due), TODAY) : 0;
  const at = st === "Fully received" ? 3 : p.received > 0 ? 2 : st === "In transit" || st === "Overdue" ? 1 : 0;
  const canReceive = outstanding > 0 && ["director", "storekeeper"].includes(s.role) && !role.readOnly;
  const [qty, setQty] = useState(outstanding);
  const [rej, setRej] = useState(0);
  const [insp, setInsp] = useState(role.user);
  const [note, setNote] = useState("Quantity and condition verified");
  const [result, setResult] = useState<null | { grn: string; stockBefore: number; stockAfter: number; wacBefore: number; wacAfter: number; tags: string }>(null);

  const post = () => {
    const r = s.postGRN(p.po, { qty, rejected: rej, inspector: insp, remark: note });
    if (!r.ok) { toast.error(r.title, { description: r.message }); return; }
    toast.success(r.title, { description: r.message });
    setResult(r.detail ?? null);
  };

  return (
    <Section className="self-start" title={p.item} description={`${p.vendor} · ${p.source}`}
      action={<div className="flex items-center gap-2"><Status tone={STATUS_TONE[st] ?? "neutral"}>{st}</Status><Button size="sm" variant="outline" onClick={onDoc}><FileText /> PO</Button></div>}>
      <div className="grid gap-4">
        <Stepper steps={["Issued", "Dispatched", "Part received", "Received", "Closed"]} at={at} />
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Ordered" value={p.qty} />
          <Stat label="Received" value={p.received} tone="success" />
          <Stat label="Outstanding" value={outstanding} tone={outstanding ? "warning" : undefined} />
        </div>
        <KV rows={[
          ["Unit price", <span key="u" className="font-mono">{pkr(p.unitPrice)}</span>],
          ["Order value", <span key="v" className="font-mono">{pkr(poValue(p))} + {Math.round(p.taxRate * 100)}% tax = <b>{pkr(poValue(p) * (1 + p.taxRate))}</b></span>],
          ["Budget commitment", `${head?.name ?? p.budgetHead} · posted on release`],
          ["Delivery", `Due ${p.due} · LD ${p.ld}`],
          ["Payment", p.terms],
        ]} />
        {late > 0 && (
          <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/8 p-3 text-xs">
            <AlertTriangle className="size-4 shrink-0 text-destructive" />
            <div><b className="text-[13px]">{late} days late</b><br />Liquidated damages at 0.1% per day: {pkr(poValue(p) * 0.001 * late)} so far. Delay recorded against vendor performance.</div>
          </div>
        )}
        {result && (
          <div className="flex gap-2 rounded-lg border border-success/30 bg-success/8 p-3 text-xs">
            <PackageCheck className="size-4 shrink-0 text-success" />
            <div><b className="text-[13px]">{result.grn} posted</b><br />Stock at Gaddafi Central {num(result.stockBefore)} → <b>{num(result.stockAfter)}</b> · average cost {pkr(result.wacBefore)} → <b>{pkr(result.wacAfter)}</b>
              {result.tags && <><br />Asset tags created: <span className="font-mono">{result.tags}</span></>}<br />Passed to Finance for three-way match.</div>
          </div>
        )}
        {canReceive ? (
          <div className="grid gap-3 border-t pt-4">
            <div className="text-[13px] font-semibold">Record goods receipt</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label htmlFor="q">Quantity received</Label><Input id="q" type="number" min={1} max={outstanding} value={qty} onChange={(e) => setQty(+e.target.value)} /></div>
              <div className="grid gap-1.5"><Label htmlFor="r">Rejected at inspection</Label><Input id="r" type="number" min={0} value={rej} onChange={(e) => setRej(+e.target.value)} /></div>
              <div className="grid gap-1.5"><Label htmlFor="i">Inspected by</Label><Input id="i" value={insp} onChange={(e) => setInsp(e.target.value)} /></div>
              <div className="grid gap-1.5"><Label htmlFor="n">Remark</Label><Input id="n" value={note} onChange={(e) => setNote(e.target.value)} /></div>
            </div>
            <Button className="justify-self-start" onClick={post}><Box /> Post GRN and update stock</Button>
          </div>
        ) : outstanding > 0 ? <p className="text-xs text-muted-foreground">Goods receipt is recorded by the Central Storekeeper or Director Procurement.</p> : null}
      </div>
    </Section>
  );
}

function GateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useApp();
  const router = useRouter();
  const gates = tenderGates(s);
  const blocked = gates.some((g) => !g.ok);
  const draft: PurchaseOrder = {
    po: "PO-PCB-2026-0331", date: "13-Oct-2026", vendor: "Signify Pakistan Ltd (Philips Lighting)", vendorId: "VND-0101", source: "Tender PCB/LOG-PSL10/2026/089",
    itemCode: "PCB-INF-LGT-0018", item: "Philips ArenaVision LED luminaire 1500W", qty: 110, received: 0, unitPrice: 400000,
    extras: [{ desc: "Turnkey rigging, aiming and commissioning (lump sum)", amount: 4200000 }], taxRate: 0.18, budgetHead: "BH-CAP-INF", due: "20-Jan-2027", ld: "0.1% per day, max 10%", terms: "10% advance against bank guarantee, 90% on commissioning", status: "Issued",
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={blocked ? "sm:max-w-lg" : "sm:max-w-3xl"}>
        <DialogHeader>
          <DialogTitle>{blocked ? "Purchase order release is blocked" : "Generate purchase order from approved evaluation"}</DialogTitle>
          <DialogDescription>{blocked ? "Tender 089 must pass every PPRA check below before a PO is generated." : "All PPRA checks passed. Vendor, items, prices and terms come from the approved comparative statement."}</DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-lg border">
          {gates.map((g) => (
            <li key={g.label} className="flex items-center gap-3 px-3 py-2.5 text-[13px]">
              {g.ok ? <Check className="size-4 shrink-0 text-success" /> : <X className="size-4 shrink-0 text-destructive" />}
              <span className="flex-1">{g.label}</span>
              {!g.ok && g.href && <Button variant="link" size="sm" className="h-auto p-0" onClick={() => { onOpenChange(false); router.push(g.href!); }}>Resolve</Button>}
            </li>
          ))}
        </ul>
        {!blocked && <div className="max-h-[50vh] overflow-y-auto"><PODocument p={draft} /></div>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{blocked ? "Close" : "Cancel"}</Button>
          {!blocked && <Button className="bg-gold text-gold-foreground hover:bg-gold/90" onClick={() => { const r = s.issuePO089(); toast.success(r.title, { description: r.message }); onOpenChange(false); router.push("/orders/?po=PO-PCB-2026-0331"); }}><Mail /> Release PO and email vendor</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PODocument({ p }: { p: PurchaseOrder }) {
  const vendors = useApp((s) => s.vendors);
  const heads = useApp((s) => s.budgetHeads);
  const v = vendors.find((x) => x.id === p.vendorId);
  const base = poValue(p);
  const lines = [{ desc: p.item, code: p.itemCode, qty: p.qty, rate: p.unitPrice, amount: p.qty * p.unitPrice }, ...(p.extras ?? []).map((x) => ({ desc: x.desc, code: "—", qty: 1, rate: x.amount, amount: x.amount }))];
  return (
    <DocPaper subtitle="Gaddafi Stadium, Ferozepur Road, Lahore · Procurement Wing" kind="Purchase order" refNo={p.po} date={p.date}>
      <KV className="mb-4" rows={[["Vendor", `${p.vendor} · NTN ${v?.ntn ?? "—"}`], ["Source", p.source], ["Budget head", heads.find((h) => h.id === p.budgetHead)?.name ?? p.budgetHead]]} />
      <table className="w-full text-xs">
        <thead><tr className="border-b text-left text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]"><th className="py-2">Description</th><th>Item code</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
        <tbody className="font-mono tabular">
          {lines.map((l) => <tr key={l.desc} className="border-b"><td className="py-2 font-sans">{l.desc}</td><td>{l.code}</td><td className="text-right">{l.qty}</td><td className="text-right">{num(l.rate)}</td><td className="text-right">{num(l.amount)}</td></tr>)}
          <tr className="border-b"><td colSpan={4} className="py-2 text-right font-sans text-[var(--muted-foreground)]">Sales tax {Math.round(p.taxRate * 100)}%</td><td className="text-right">{num(base * p.taxRate)}</td></tr>
          <tr><td colSpan={4} className="py-2 text-right font-sans font-semibold">Total (PKR)</td><td className="text-right font-semibold">{num(base * (1 + p.taxRate))}</td></tr>
        </tbody>
      </table>
      <KV className="mt-4" rows={[["Delivery", `By ${p.due} to Gaddafi Stadium Central Store`], ["Liquidated damages", p.ld], ["Payment", p.terms]]} />
    </DocPaper>
  );
}
