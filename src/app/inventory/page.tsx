"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowRightLeft, Check, ClipboardList, Package, Plus, QrCode, Warehouse, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AreaTrend, BarList, KpiGrid, PageHeader, Section, Status, Stepper } from "@/components/dash";
import { ItemSheet } from "@/components/item-sheet";
import { useApp, useRole } from "@/lib/store";
import { fmtD, num, pkr } from "@/lib/domain";
import { cn } from "@/lib/utils";

export default function InventoryPage() {
  return <Suspense><Inventory /></Suspense>;
}

const DEPTS = ["High Performance Centre", "Grounds & Pitches", "Men's National Team", "Women's National Team", "PSL Operations", "Domestic Cricket Operations"];

function Inventory() {
  const s = useApp();
  const role = useRole();
  const params = useSearchParams();
  const router = useRouter();
  const [store, setStore] = useState(params.get("store") ?? "all");
  const [sheet, setSheet] = useState<string | null>(null);
  const [demandOpen, setDemandOpen] = useState(params.get("new") === "1");
  const [transferOpen, setTransferOpen] = useState(false);

  const d = s.demands[0];
  const dItem = s.itemsMaster.find((i) => i.code === d.itemCode);
  const low = s.itemsMaster.filter((i) => i.totalStock <= i.reorderLevel);
  const stockValue = s.stadiumStores.reduce((a, x) => a + x.valuationPkr, 0);
  const st = s.stockTake;
  const variance = st.lines.reduce((a, l) => a + (l.counted - l.book) * (s.itemsMaster.find((i) => i.code === l.code)?.avgCostPkr ?? 0), 0);
  const demandAt = d.status.startsWith("Fulfilled") ? 5 : d.status.includes("approved") ? 4 : 3;

  return (
    <>
      <PageHeader module="Modules 1 & 2" title="Demand & inventory" description="Electronic demands with stock-availability branching, reservation and budget checks, on one ledger across every store."
        actions={!role.readOnly && <>
          <Button variant="outline" onClick={() => setTransferOpen(true)}><ArrowRightLeft /> Transfer stock</Button>
          <Button onClick={() => setDemandOpen(true)}><Plus /> Raise demand</Button>
        </>} />

      <KpiGrid items={[
        { label: "Stock value, all stores", prefix: "PKR", value: stockValue / 1e6, decimals: 1, suffix: "M", icon: Warehouse, hero: true, spark: s.analytics.stockValue, foot: "5 stores · one ledger" },
        { label: "Open demands", value: s.analytics.openDemands[3] + (s.demands.length - 4), icon: ClipboardList, delta: { dir: "down", text: "−9 vs September", good: true }, spark: s.analytics.openDemands, sparkColor: "var(--chart-2)" },
        { label: "At or below re-order level", value: low.length, icon: AlertTriangle, foot: low.map((i) => i.code.split("-")[2]).join(" · ") },
        { label: "Fulfilled from stock", value: 52, suffix: "%", icon: Package, foot: "Of demands this FY, no procurement needed" },
      ]} />

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section className="self-start border-l-2 border-l-primary" title={`Stock-availability branching · ${d.id}`} description={`${d.by} requested ${d.qty} × ${dItem?.name ?? d.itemCode} for “${d.purpose}”. Required by ${d.requiredBy}.`} action={<Status tone="neutral" icon={null}>{d.dept}</Status>}>
          <div className={cn("grid gap-3", d.branch === "partial" && "md:grid-cols-2")}>
            {d.branch !== "none" && (
              <div className="rounded-lg border border-l-2 border-l-success bg-muted/30 p-4">
                <div className="flex items-center justify-between"><Status tone="success">{d.branch === "full" ? `All ${d.qty} available` : `${d.issued} issued from stock`}</Status><span className="font-mono text-[11px]">{d.sin}</span></div>
                <div className="mt-2 text-[13px] font-semibold">Gaddafi Stadium Central Store</div>
                <p className="text-xs text-muted-foreground">Stock reserved against this demand so it can&apos;t be promised twice.</p>
              </div>
            )}
            {d.prQty > 0 && (
              <div className={cn("rounded-lg border border-l-2 bg-muted/30 p-4", d.branch === "none" ? "border-l-destructive" : "border-l-warning")}>
                <div className="flex items-center justify-between"><Status tone={d.branch === "none" ? "danger" : "warning"}>{d.branch === "none" ? "Not in stock" : `${d.prQty} short`}</Status><span className="font-mono text-[11px]">{d.pr}</span></div>
                <div className="mt-2 text-[13px] font-semibold">Purchase requisition to Procurement</div>
                <p className="text-xs text-muted-foreground">Raised automatically under the same demand number and Item Code.</p>
              </div>
            )}
          </div>
          <div className="mt-4"><Stepper steps={["Raised", "Stock checked", d.branch === "none" ? "PR raised" : "Issued / reserved", "Approval", "Delivered"]} at={demandAt} /></div>
        </Section>
        <Section className="self-start" title="Valuation by store" description="PKR millions. Select a store to filter the ledger.">
          <BarList rows={s.stadiumStores.map((x) => ({ name: x.name.replace(" Central Store", "").replace(" Stadium", ""), value: x.valuationPkr / 1e6 }))} format={(v) => `${v.toFixed(1)}M`} onSelect={(i) => setStore(s.stadiumStores[i].id)} />
        </Section>
      </div>

      <Section className="mb-6" title="Demand register" description="Every demand is recorded, including those fulfilled from stock, with a permanent number." flush>
        <Table>
          <TableHeader><TableRow><TableHead className="pl-5">Demand</TableHead><TableHead>Department</TableHead><TableHead>Item</TableHead><TableHead>Outcome</TableHead><TableHead>Required by</TableHead><TableHead className="pr-5">Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {s.demands.map((x) => {
              const it = s.itemsMaster.find((i) => i.code === x.itemCode);
              return (
                <TableRow key={x.id}>
                  <TableCell className="pl-5"><div className="font-mono text-xs font-semibold">{x.id}</div><div className="text-[11px] text-muted-foreground">{x.date}</div></TableCell>
                  <TableCell><div className="text-[13px] font-medium">{x.dept}</div><div className="text-[11px] text-muted-foreground">{x.by}</div></TableCell>
                  <TableCell className="max-w-[16rem] whitespace-normal"><div className="line-clamp-1 text-[13px]">{it?.name ?? x.itemCode}</div><div className="font-mono text-[11px] text-muted-foreground">{x.itemCode} · qty {x.qty}</div></TableCell>
                  <TableCell><div className="flex flex-wrap gap-1">{x.issued > 0 && <Status tone="success" icon={null}>{x.issued} issued</Status>}{x.prQty > 0 && <Status tone="warning" icon={null}>{x.prQty} to PR</Status>}</div><div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{[x.sin, x.pr].filter(Boolean).join(" · ")}</div></TableCell>
                  <TableCell className="text-xs">{x.requiredBy}</TableCell>
                  <TableCell className="pr-5"><Status tone={x.status.startsWith("Fulfilled") ? "success" : x.status.includes("approved") || x.status.includes("evaluation") ? "info" : "warning"}>{x.status}</Status></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Section>

      <Section className="mb-6" title="Stock ledger" description="Select an item for its store distribution, movements and costs." flush
        action={<Tabs value={store} onValueChange={setStore}><TabsList className="flex-wrap"><TabsTrigger value="all">All stores</TabsTrigger>{s.stadiumStores.map((x) => <TabsTrigger key={x.id} value={x.id}>{x.city === "Lahore" && x.id !== "STORE-LHR-01" ? "NCA" : x.city}</TabsTrigger>)}</TabsList></Tabs>}>
        <Table>
          <TableHeader><TableRow><TableHead className="pl-5">Item</TableHead><TableHead>Class</TableHead><TableHead className="text-right">All stores</TableHead><TableHead className="text-right">{store === "all" ? "Gaddafi Central" : "Selected store"}</TableHead><TableHead>Re-order</TableHead><TableHead className="text-right">WAC (PKR)</TableHead><TableHead className="pr-5" /></TableRow></TableHeader>
          <TableBody>
            {s.itemsMaster.map((i) => {
              const lowI = i.totalStock <= i.reorderLevel;
              return (
                <TableRow key={i.code} className="cursor-pointer" onClick={() => setSheet(i.code)}>
                  <TableCell className="max-w-[22rem] pl-5 whitespace-normal"><div className="text-[13px] font-semibold">{i.name}</div><div className="font-mono text-[11px] text-muted-foreground">{i.code} · {i.uom}</div></TableCell>
                  <TableCell><div className="flex gap-1"><Status tone="neutral" icon={null}>{i.budgetType}</Status><Status tone="neutral" icon={null}>{i.classification.includes("Asset") ? "Asset" : "Consumable"}</Status></div></TableCell>
                  <TableCell className="text-right font-mono text-[13px] font-semibold tabular">{i.totalStock}</TableCell>
                  <TableCell className="text-right font-mono text-[13px] font-semibold text-primary tabular">{i.storeBreakdown[store === "all" ? "STORE-LHR-01" : store] ?? 0}</TableCell>
                  <TableCell>{lowI ? <Status tone="warning">Re-order (≤ {i.reorderLevel})</Status> : <span className="font-mono text-xs text-muted-foreground">{i.reorderLevel}</span>}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular">{num(i.avgCostPkr)}</TableCell>
                  <TableCell className="pr-5 text-right"><Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); toast.success("Label sent to printer", { description: `Barcode and QR label for ${i.code} queued on Zebra ZD621.` }); }}><QrCode /> Tag</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section className="self-start" title={`Physical stock-take · ${st.id}`} description={`${st.store} · counted ${st.date} by ${st.countedBy}`} flush
          action={st.status === "Approved" ? <Status tone="success">Adjustments approved</Status> : <Status tone="warning">{st.status}</Status>}>
          <Table>
            <TableHeader><TableRow><TableHead className="pl-5">Item</TableHead><TableHead className="text-right">Book</TableHead><TableHead className="text-right">Counted</TableHead><TableHead className="text-right">Variance</TableHead><TableHead className="pr-5 text-right">Value (PKR)</TableHead></TableRow></TableHeader>
            <TableBody>
              {st.lines.map((l) => {
                const it = s.itemsMaster.find((i) => i.code === l.code)!;
                const v = l.counted - l.book;
                return (
                  <TableRow key={l.code}>
                    <TableCell className="max-w-[16rem] truncate pl-5 text-[13px]">{it.name}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular">{l.book}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular">{l.counted}</TableCell>
                    <TableCell className={cn("text-right font-mono text-xs font-semibold tabular", v ? "text-destructive" : "text-muted-foreground")}>{v > 0 ? "+" : ""}{v}</TableCell>
                    <TableCell className={cn("pr-5 text-right font-mono text-xs tabular", v ? "text-destructive" : "text-muted-foreground")}>{num(v * it.avgCostPkr)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between gap-3 border-t px-5 py-3 text-xs text-muted-foreground">
            <span>Net variance <b className={variance ? "text-destructive" : ""}>{pkr(variance)}</b> · posts only after approval</span>
            {st.status !== "Approved" && !role.readOnly && <Button size="sm" onClick={() => { s.approveStockTake(); toast.success("Stock-take adjustment approved"); }}>Approve adjustments</Button>}
          </div>
        </Section>
        <Section className="self-start" title="Total stock value" description="Month-end value across all stores, PKR millions.">
          <AreaTrend data={s.analytics.months.map((m: string, i: number) => ({ m, v: s.analytics.stockValue[i] }))} xKey="m" series={[{ key: "v", label: "Stock value", color: "var(--chart-1)", area: true }]} valueFormat={(v) => `${v}`} height={230} />
        </Section>
      </div>

      <ItemSheet code={sheet} onOpenChange={(o) => !o && setSheet(null)} />
      <DemandDialog open={demandOpen} onOpenChange={(o) => { setDemandOpen(o); if (!o && params.get("new")) router.replace("/inventory/", { scroll: false }); }} />
      <TransferDialog open={transferOpen} onOpenChange={setTransferOpen} />
    </>
  );
}

function DemandDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useApp();
  const role = useRole();
  const [dept, setDept] = useState(DEPTS[0]);
  const [code, setCode] = useState(s.itemsMaster[0].code);
  const item = s.itemsMaster.find((i) => i.code === code)!;
  const defaultHead = item.budgetType === "CapEx" ? (code.includes("BRD") ? "BH-CAP-BRD" : "BH-CAP-INF") : "BH-OPX-HPC";
  const [headId, setHeadId] = useState<string | null>(null);
  const head = s.budgetHeads.find((b) => b.id === (headId ?? defaultHead))!;
  const [qty, setQty] = useState(100);
  const [date, setDate] = useState("2026-11-01");
  const [purpose, setPurpose] = useState("NCA pre-season camp");

  const avail = item.storeBreakdown["STORE-LHR-01"] ?? 0;
  const issue = Math.min(avail, Math.max(0, qty)), pr = Math.max(0, qty) - issue;
  const prValue = pr * item.avgCostPkr;
  const headAvail = head.allocation - head.committed;
  const over = pr > 0 && prValue > headAvail;
  const mismatch = head.type !== item.budgetType;
  const canSubmit = qty > 0 && !over && purpose.trim().length > 0;

  const submit = () => {
    const r = s.submitDemand({ dept, itemCode: code, qty, requiredBy: date ? fmtD(new Date(date)) : "—", purpose, budgetHead: head.id });
    toast.success(r.title, { description: r.message });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader><DialogTitle>Raise a demand</DialogTitle><DialogDescription>Requested by {role.user} · {role.label}</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5"><Label>Department</Label><Select value={dept} onValueChange={setDept}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{DEPTS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label htmlFor="rb">Required by</Label><Input id="rb" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="col-span-2 grid gap-1.5"><Label>Item</Label><Select value={code} onValueChange={(v) => { setCode(v); setHeadId(null); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{s.itemsMaster.map((i) => <SelectItem key={i.code} value={i.code}><span className="font-mono text-xs">{i.code}</span> {i.name.slice(0, 42)}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label htmlFor="qty">Quantity</Label><Input id="qty" type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Budget head</Label><Select value={head.id} onValueChange={setHeadId}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{s.budgetHeads.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="col-span-2 grid gap-1.5"><Label htmlFor="pp">Purpose</Label><Input id="pp" value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
        </div>
        <div className="grid gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock and budget check</div>
          {qty <= 0 ? null : pr === 0 ? (
            <Callout tone="success" icon={Check} title={`Fully in stock: ${qty} of ${avail} available`}>Issued from Gaddafi Central and reserved immediately. Closes as fulfilled from stock.</Callout>
          ) : issue > 0 ? (
            <Callout tone="warning" icon={AlertTriangle} title={`Partly in stock: ${issue} issued, ${pr} to Procurement`}>{issue} reserved and issued. A requisition for {pr} (≈ {pkr(prValue)}) is raised under the same demand number and Item Code.</Callout>
          ) : (
            <Callout tone="danger" icon={X} title="Not in stock">The full {qty} goes to Procurement as a requisition (≈ {pkr(prValue)}).</Callout>
          )}
          {pr > 0 && (over
            ? <Callout tone="danger" icon={Wallet} title={`Insufficient budget on ${head.name}`}>Needs {pkr(prValue)}; {pkr(headAvail)} uncommitted. Reduce the quantity or choose another head.</Callout>
            : <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="size-3.5" />Budget check passed: {pkr(headAvail)} uncommitted on {head.name}.</p>)}
          {mismatch && <p className="flex items-center gap-1.5 text-xs text-warning"><AlertTriangle className="size-3.5" />This item is {item.budgetType}; the selected head is {head.type}.</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={!canSubmit} onClick={submit}>Submit demand</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Callout({ tone, icon: Icon, title, children }: { tone: "success" | "warning" | "danger"; icon: React.ElementType; title: string; children: React.ReactNode }) {
  const c = { success: "border-success/30 bg-success/8 [&_svg]:text-success", warning: "border-warning/30 bg-warning/8 [&_svg]:text-warning", danger: "border-destructive/30 bg-destructive/8 [&_svg]:text-destructive" }[tone];
  return <div className={cn("flex gap-2.5 rounded-lg border p-3 text-xs", c)}><Icon className="mt-0.5 size-4 shrink-0" /><div><div className="text-[13px] font-semibold">{title}</div>{children}</div></div>;
}

function TransferDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useApp();
  const [code, setCode] = useState(s.itemsMaster[0].code);
  const [from, setFrom] = useState("STORE-LHR-01");
  const [to, setTo] = useState("STORE-KHI-01");
  const [qty, setQty] = useState(5);
  const [reason, setReason] = useState("Match-day allocation");
  const [err, setErr] = useState("");
  const item = s.itemsMaster.find((i) => i.code === code)!;
  const submit = () => {
    const r = s.transferStock({ code, from, to, qty, reason });
    if (!r.ok) { setErr(r.message); return; }
    toast.success(r.title, { description: r.message });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={(o) => { setErr(""); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Transfer stock between stores</DialogTitle><DialogDescription>Needs the receiving custodian&apos;s confirmation and is traceable by Item Code.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid gap-1.5"><Label>Item</Label><Select value={code} onValueChange={setCode}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{s.itemsMaster.map((i) => <SelectItem key={i.code} value={i.code}>{i.code} · {i.name.slice(0, 36)}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label>From ({item.storeBreakdown[from] ?? 0} available)</Label><Select value={from} onValueChange={setFrom}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{s.stadiumStores.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label>To</Label><Select value={to} onValueChange={setTo}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{s.stadiumStores.map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label htmlFor="tq">Quantity</Label><Input id="tq" type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="tr">Reason</Label><Input id="tr" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit}>Authorise transfer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
