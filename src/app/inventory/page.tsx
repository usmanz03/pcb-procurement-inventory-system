"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "motion/react";
import { AlertTriangle, ArrowDownLeft, ArrowRightLeft, Building2, Check, ClipboardCheck, Clock, EyeOff, MoreHorizontal, Pencil, Plus, Power, QrCode, Search, Tag, Undo2, Warehouse, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, KpiGrid, PageHeader, Section, Status, type Tone } from "@/components/dash";
import { QrLabelDialog } from "@/components/qr-label";
import { TYPE_LABEL, TYPE_TONE } from "@/components/item-sheet";
import { useApp, useRole } from "@/lib/store";
import { available, isActive } from "@/lib/engine-stores";
import { mil, num, parseD, pkr } from "@/lib/domain";
import type { LedgerType, StockTake, Store } from "@/lib/types";
import { cn } from "@/lib/utils";

type StoreX = Store & { status?: string; lastAudit?: string };
const short = (n: string) => n.replace(" Central Store", "").replace(" Cricket Stadium", "").replace(" Stadium", "").replace(" (NCA)", "");
const STK_TONE: Record<StockTake["status"], Tone> = { Counting: "info", Submitted: "warning", Approved: "success", Cancelled: "neutral" };
const DEPTS = ["High Performance Centre", "Grounds & Pitches", "Men's National Team", "Women's National Team", "PSL Operations", "Domestic Cricket Operations"];

export default function InventoryPage() {
  return <Suspense><Inventory /></Suspense>;
}

function Inventory() {
  const s = useApp();
  const role = useRole();
  const params = useSearchParams();
  const canAct = !role.readOnly && ["director", "storekeeper"].includes(s.role);
  const stores = s.stadiumStores as StoreX[];
  const [store, setStore] = useState(params.get("store") ?? "all");
  const [tab, setTab] = useState<"position" | "moves" | "assets" | "counts">("position");
  const [storeDlg, setStoreDlg] = useState<StoreX | "new" | null>(null);
  const [transfer, setTransfer] = useState(false);
  const [ret, setRet] = useState(false);
  const [sheet, setSheet] = useState<string | null>(null);
  const [qr, setQr] = useState<{ code: string; title: string; sub: string } | null>(null);

  const held = (id: string) => s.itemsMaster.reduce((a, i) => a + (i.storeBreakdown[id] ?? 0), 0);
  const stockValue = stores.reduce((a, x) => a + x.valuationPkr, 0);
  const low = s.itemsMaster.filter((i) => isActive(i) && i.totalStock <= i.reorderLevel);
  const openCounts = s.stockTakes.filter((t) => t.status === "Counting" || t.status === "Submitted");
  const startCount = (id: string) => { const r = s.startStockTake(id); toast[r.ok ? "success" : "error"](r.title, { description: r.message }); if (r.ok) { setTab("counts"); setSheet(r.detail.id); } };

  return (
    <>
      <PageHeader module="Stores" title="Stores & stock" description="Every store on one ledger: what is held where, every movement in and out, asset tags, and physical counts reconciled to the books."
        actions={canAct && <>
          <Button variant="outline" onClick={() => setRet(true)}><Undo2 /> Receive a return</Button>
          <Button variant="outline" onClick={() => setTransfer(true)}><ArrowRightLeft /> Transfer stock</Button>
          <Button onClick={() => setStoreDlg("new")}><Plus /> Add store</Button>
        </>} />

      <KpiGrid items={[
        { label: "Stock value, all stores", prefix: "PKR", value: stockValue / 1e6, decimals: 1, suffix: "M", icon: Warehouse, hero: true, spark: s.analytics.stockValue, foot: `${stores.filter((x) => (x.status ?? "Active") === "Active").length} stores · one ledger` },
        { label: "At or below re-order level", value: low.length, icon: AlertTriangle, foot: low.map((i) => i.code.split("-")[2]).join(" · ") || "All healthy", delta: low.length ? { dir: "up", text: "Re-order now", good: false } : undefined },
        { label: "Reserved for demands", value: s.itemsMaster.reduce((a, i) => a + (i.reserved ?? 0), 0), icon: Clock, foot: "Held until the store issues", href: "/demands/" },
        { label: "Open stock-takes", value: openCounts.length, icon: ClipboardCheck, foot: openCounts.map((t) => t.id).join(", ") || "None in progress" },
      ]} />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stores.map((x, i) => {
          const active = (x.status ?? "Active") === "Active";
          const sel = store === x.id;
          return (
            <motion.div key={x.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className={cn("card-lift group relative flex flex-col gap-2 rounded-xl border bg-card p-4 transition-all", sel && "border-primary shadow-[0_0_0_3px] shadow-primary/15", !active && "opacity-60")}>
              <button type="button" className="absolute inset-0 rounded-xl" aria-label={`Show ${x.name}`} onClick={() => { setStore(sel ? "all" : x.id); setTab("position"); }} />
              <div className="flex items-start justify-between gap-2">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary"><Building2 className="size-4" /></span>
                {canAct && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" className="relative z-10 -mt-1 -mr-2 size-8" aria-label="Store actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setStoreDlg(x)}><Pencil /> Edit store</DropdownMenuItem>
                      {active && <DropdownMenuItem onClick={() => startCount(x.id)}><ClipboardCheck /> Start stock-take</DropdownMenuItem>}
                      {x.id !== "STORE-LHR-01" && s.role === "director" && <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { const r = s.setStoreStatus(x.id, active ? "Inactive" : "Active"); toast[r.ok ? "success" : "error"](r.title, { description: r.message }); }}><Power /> {active ? "Close store" : "Reopen store"}</DropdownMenuItem>
                      </>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="min-w-0"><div className="truncate text-sm font-semibold">{short(x.name)}</div><div className="truncate text-[11px] text-muted-foreground">{x.city} · {x.type}</div></div>
              <div className="flex items-end justify-between gap-2">
                <div><div className="font-display text-2xl font-semibold leading-none">{mil(x.valuationPkr)}</div><div className="text-[11px] text-muted-foreground">{num(held(x.id))} units in catalogue</div></div>
                {active ? <Status tone="success" icon={null}>Open</Status> : <Status tone="neutral" icon={null}>Closed</Status>}
              </div>
              <div className="truncate border-t pt-2 text-[11px] text-muted-foreground">Custodian {x.custodian} · counted {x.lastAudit ?? "—"}</div>
            </motion.div>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mb-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="position"><Warehouse /> Stock position</TabsTrigger>
          <TabsTrigger value="moves"><ArrowRightLeft /> Movement history</TabsTrigger>
          <TabsTrigger value="assets"><Tag /> Asset tags</TabsTrigger>
          <TabsTrigger value="counts"><ClipboardCheck /> Stock-takes {openCounts.length ? `(${openCounts.length})` : ""}</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "position" && <Position store={store} setStore={setStore} onLabel={(c, t) => setQr({ code: c, title: t, sub: "Gaddafi Stadium Central Store" })} />}
      {tab === "moves" && <Movements />}
      {tab === "assets" && <Assets onLabel={(c, t, sub) => setQr({ code: c, title: t, sub })} />}
      {tab === "counts" && <Counts onOpen={setSheet} onStart={startCount} canAct={canAct} />}

      <StoreDialog key={`store-${storeDlg === "new" ? "new" : storeDlg?.id ?? ""}`} value={storeDlg} onClose={() => setStoreDlg(null)} />
      <TransferDialog open={transfer} onOpenChange={setTransfer} />
      <ReturnDialog open={ret} onOpenChange={setRet} />
      <CountSheet key={`sheet-${sheet ?? ""}`} id={sheet} onClose={() => setSheet(null)} />
      <QrLabelDialog code={qr?.code ?? null} title={qr?.title} sub={qr?.sub} onClose={() => setQr(null)} />
    </>
  );
}

/* ---------- Stock position ---------- */
function Position({ store, setStore, onLabel }: { store: string; setStore: (s: string) => void; onLabel: (code: string, title: string) => void }) {
  const s = useApp();
  const [q, setQ] = useState("");
  const stores = s.stadiumStores as StoreX[];
  const cols = store === "all" ? stores : stores.filter((x) => x.id === store);
  const items = s.itemsMaster.filter((i) => isActive(i) && (!q.trim() || `${i.code} ${i.name}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <Section title={store === "all" ? "Stock position, all stores" : `Stock position · ${stores.find((x) => x.id === store)?.name}`} description="Quantities by store, with what is free to issue at the central store." flush
      action={<div className="flex flex-wrap items-center gap-2"><div className="relative w-56"><Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" /><Input className="h-9 pl-8" placeholder="Search item…" value={q} onChange={(e) => setQ(e.target.value)} /></div>{store !== "all" && <Button size="sm" variant="ghost" onClick={() => setStore("all")}><X /> All stores</Button>}</div>}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="pl-5">Item</TableHead>
            {cols.map((x) => <TableHead key={x.id} className="text-right">{short(x.name)}</TableHead>)}
            <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Free at central</TableHead><TableHead>Re-order</TableHead><TableHead className="pr-5" />
          </TableRow></TableHeader>
          <TableBody>
            {items.map((i) => {
              const lowI = i.totalStock <= i.reorderLevel;
              return (
                <TableRow key={i.code}>
                  <TableCell className="max-w-[20rem] pl-5 whitespace-normal"><Link href={`/catalogue/?code=${i.code}`} className="text-[13px] font-semibold hover:text-primary hover:underline">{i.name}</Link><div className="font-mono text-[11px] text-muted-foreground">{i.code} · {i.uom}</div></TableCell>
                  {cols.map((x) => <TableCell key={x.id} className={cn("text-right font-mono text-xs tabular", !(i.storeBreakdown[x.id] ?? 0) && "text-muted-foreground/50")}>{i.storeBreakdown[x.id] ?? 0}</TableCell>)}
                  <TableCell className="text-right font-mono text-[13px] font-semibold tabular">{num(i.totalStock)}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular">{available(i)}{(i.reserved ?? 0) > 0 && <div className="text-[10px] text-gold-text">{i.reserved} reserved</div>}</TableCell>
                  <TableCell>{lowI ? <Status tone="warning">≤ {i.reorderLevel}</Status> : <span className="font-mono text-xs text-muted-foreground">{i.reorderLevel}</span>}</TableCell>
                  <TableCell className="pr-5 text-right"><Button size="sm" variant="ghost" onClick={() => onLabel(i.code, i.name)}><QrCode /> Label</Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}

/* ---------- Movement history ---------- */
function Movements() {
  const s = useApp();
  const [type, setType] = useState<"all" | LedgerType>("all");
  const [item, setItem] = useState("all");
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const all = Object.entries(s.itemLedgers).flatMap(([code, L]) => L.entries.map((e, k) => ({ ...e, code, k })));
    return all.filter((e) => (type === "all" || e.type === type) && (item === "all" || e.code === item) && (!q.trim() || `${e.ref} ${e.doc} ${e.party} ${e.purpose} ${e.recipient ?? ""}`.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => parseD(b.date).getTime() - parseD(a.date).getTime() || b.k - a.k);
  }, [s.itemLedgers, type, item, q]);
  const inQty = rows.filter((r) => r.qty > 0).reduce((a, r) => a + r.qty, 0), outQty = rows.filter((r) => r.qty < 0).reduce((a, r) => a - r.qty, 0);
  return (
    <Section title="Movement history" description={`Every receipt, issue, transfer, return and adjustment, with its document and who it went to. ${rows.length} movements · ${num(inQty)} in · ${num(outQty)} out.`} flush>
      <div className="flex flex-wrap gap-2 px-5 pb-4">
        <div className="relative min-w-[12rem] flex-1"><Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search document, party, purpose…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All movements</SelectItem>{(["GRN", "ISSUE", "TRANSFER_OUT", "TRANSFER_IN", "RETURN", "ADJUST"] as LedgerType[]).map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent></Select>
        <Select value={item} onValueChange={setItem}><SelectTrigger className="w-60"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All items</SelectItem>{s.itemsMaster.map((i) => <SelectItem key={i.code} value={i.code}>{i.name.slice(0, 38)}</SelectItem>)}</SelectContent></Select>
      </div>
      <div className="max-h-[560px] overflow-y-auto">
        <Table>
          <TableHeader><TableRow><TableHead className="pl-5">Date</TableHead><TableHead>Movement</TableHead><TableHead>Item</TableHead><TableHead>To / from</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="pr-5">Document</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((e) => {
              const it = s.itemsMaster.find((i) => i.code === e.code);
              return (
                <TableRow key={`${e.code}-${e.k}`}>
                  <TableCell className="pl-5 text-xs whitespace-nowrap">{e.date}</TableCell>
                  <TableCell><Status tone={TYPE_TONE[e.type]} icon={e.qty > 0 ? ArrowDownLeft : null}>{TYPE_LABEL[e.type]}</Status></TableCell>
                  <TableCell className="max-w-[14rem] whitespace-normal"><div className="line-clamp-1 text-xs">{it?.name ?? e.code}</div><div className="font-mono text-[10px] text-muted-foreground">{e.code}</div></TableCell>
                  <TableCell className="max-w-[14rem] whitespace-normal text-xs"><div>{e.party}</div>{e.recipient && <div className="text-muted-foreground">to {e.recipient}</div>}<div className="line-clamp-1 text-muted-foreground">{e.purpose}</div></TableCell>
                  <TableCell className={cn("text-right font-mono text-[13px] font-semibold tabular", e.qty > 0 ? "text-success" : "text-foreground")}>{e.qty > 0 ? "+" : ""}{e.qty}{e.unitCost ? <div className="text-[10px] font-normal text-muted-foreground">@ {num(e.unitCost)}</div> : null}</TableCell>
                  <TableCell className="pr-5 font-mono text-[11px]"><div>{e.ref}</div><div className="text-muted-foreground">{e.doc}</div></TableCell>
                </TableRow>
              );
            })}
            {!rows.length && <TableRow><TableCell colSpan={6}><Empty>No movements match.</Empty></TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </Section>
  );
}

/* ---------- Asset tags ---------- */
function Assets({ onLabel }: { onLabel: (code: string, title: string, sub: string) => void }) {
  const s = useApp();
  const rows = s.custodyHolders.flatMap((h) => h.assets.map((a) => ({ a, h, m: s.custodyMeta[a.assetTag] })));
  const value = rows.filter((r) => r.m?.lifecycle !== "Disposed").reduce((t, r) => t + r.a.valuePkr, 0);
  return (
    <Section title="Asset register" description={`${rows.length} tagged assets worth ${pkr(value)} in service. Each tag carries a QR label that opens its record.`} flush
      action={<Button size="sm" variant="outline" asChild><Link href="/custody/">Custody chain</Link></Button>}>
      <Table>
        <TableHeader><TableRow><TableHead className="pl-5">Tag</TableHead><TableHead>Asset</TableHead><TableHead>Held by</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Value</TableHead><TableHead className="pr-5" /></TableRow></TableHeader>
        <TableBody>
          {rows.map(({ a, h, m }) => (
            <TableRow key={a.assetTag}>
              <TableCell className="pl-5 font-mono text-xs font-semibold">{a.assetTag}</TableCell>
              <TableCell className="max-w-[16rem] whitespace-normal"><div className="line-clamp-1 text-xs">{a.description}</div><div className="font-mono text-[10px] text-muted-foreground">{a.itemCode}</div></TableCell>
              <TableCell className="text-xs"><div>{h.name}</div><div className="text-muted-foreground">{h.department}</div></TableCell>
              <TableCell><Status tone={m?.lifecycle === "Disposed" ? "danger" : m?.lifecycle === "Under Repair" ? "warning" : m?.ack === "Pending" ? "info" : "success"} icon={null}>{m?.ack === "Pending" ? "Awaiting receipt" : m?.lifecycle}</Status></TableCell>
              <TableCell className="text-right font-mono text-xs tabular">{num(a.valuePkr)}</TableCell>
              <TableCell className="pr-5 text-right"><Button size="sm" variant="ghost" onClick={() => onLabel(a.assetTag, a.description, `${h.name} · ${h.department}`)}><QrCode /> Label</Button></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Section>
  );
}

/* ---------- Stock-takes ---------- */
function Counts({ onOpen, onStart, canAct }: { onOpen: (id: string) => void; onStart: (storeId: string) => void; canAct: boolean }) {
  const s = useApp();
  const [storeId, setStoreId] = useState("STORE-LHR-01");
  return (
    <Section title="Stock-takes" description="Counters see only a blank sheet. Variances post only after someone other than the counter approves them." flush
      action={canAct && <div className="flex flex-wrap items-center gap-2"><Select value={storeId} onValueChange={setStoreId}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{(s.stadiumStores as StoreX[]).filter((x) => (x.status ?? "Active") === "Active").map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent></Select><Button onClick={() => onStart(storeId)}><Plus /> Start count</Button></div>}>
      <Table>
        <TableHeader><TableRow><TableHead className="pl-5">Stock-take</TableHead><TableHead>Store</TableHead><TableHead>Counted by</TableHead><TableHead className="text-right">Progress</TableHead><TableHead className="text-right">Variances</TableHead><TableHead>Status</TableHead><TableHead className="pr-5" /></TableRow></TableHeader>
        <TableBody>
          {s.stockTakes.map((t) => {
            const done = t.lines.filter((l) => l.counted !== null).length;
            const vars = t.lines.filter((l) => l.counted !== null && l.counted !== l.book);
            const val = vars.reduce((a, l) => a + ((l.counted as number) - l.book) * (s.itemsMaster.find((i) => i.code === l.code)?.avgCostPkr ?? 0), 0);
            return (
              <TableRow key={t.id} className="cursor-pointer" onClick={() => onOpen(t.id)}>
                <TableCell className="pl-5"><div className="font-mono text-xs font-semibold">{t.id}</div><div className="text-[11px] text-muted-foreground">{t.date}</div></TableCell>
                <TableCell className="text-xs">{t.store}</TableCell>
                <TableCell className="text-xs">{t.countedBy}{t.approvedBy && <div className="text-muted-foreground">Approved by {t.approvedBy}</div>}</TableCell>
                <TableCell className="text-right font-mono text-xs">{done} / {t.lines.length}</TableCell>
                <TableCell className="text-right font-mono text-xs">{t.status === "Counting" ? "—" : <>{vars.length}<div className={cn("text-[10px]", val ? "text-destructive" : "text-muted-foreground")}>{pkr(val)}</div></>}</TableCell>
                <TableCell><Status tone={STK_TONE[t.status]}>{t.status === "Submitted" ? "Awaiting approval" : t.status}</Status></TableCell>
                <TableCell className="pr-5 text-right"><Button size="sm" variant="outline">{t.status === "Counting" ? "Count" : t.status === "Submitted" ? "Review" : "View"}</Button></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Section>
  );
}

function CountSheet({ id, onClose }: { id: string | null; onClose: () => void }) {
  const s = useApp();
  const role = useRole();
  const t = s.stockTakes.find((x) => x.id === id);
  const [counts, setCounts] = useState<Record<string, string>>(() => Object.fromEntries((t?.lines ?? []).map((l) => [l.code, l.counted === null ? "" : String(l.counted)])));
  if (!t) return null;
  const counting = t.status === "Counting";
  const canCount = counting && !role.readOnly && ["director", "storekeeper"].includes(s.role);
  const parsed = Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, v.trim() === "" ? null : Math.floor(Number(v))])) as Record<string, number | null>;
  const done = Object.values(parsed).filter((v) => v !== null).length;
  const act = (r: { ok: boolean; title: string; message: string }) => { toast[r.ok ? "success" : "error"](r.title, { description: r.message }); return r.ok; };
  const net = t.lines.reduce((a, l) => a + ((l.counted ?? l.book) - l.book) * (s.itemsMaster.find((i) => i.code === l.code)?.avgCostPkr ?? 0), 0);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">Count sheet <span className="font-mono">{t.id}</span><Status tone={STK_TONE[t.status]}>{t.status === "Submitted" ? "Awaiting approval" : t.status}</Status></DialogTitle>
          <DialogDescription>{t.store} · started {t.date} by {t.countedBy}</DialogDescription>
        </DialogHeader>
        {counting && <div className="flex items-center gap-2 rounded-lg border border-info/30 bg-info/8 p-3 text-xs"><EyeOff className="size-4 shrink-0 text-info" />Blind count: book quantities stay hidden until the sheet is submitted, so counts are honest.</div>}
        <Table>
          <TableHeader><TableRow><TableHead>Item</TableHead>{!counting && <TableHead className="text-right">Book</TableHead>}<TableHead className="w-32 text-right">Counted</TableHead>{!counting && <><TableHead className="text-right">Variance</TableHead><TableHead className="text-right">Value</TableHead></>}</TableRow></TableHeader>
          <TableBody>
            {t.lines.map((l) => {
              const it = s.itemsMaster.find((i) => i.code === l.code);
              const v = (l.counted ?? l.book) - l.book;
              return (
                <TableRow key={l.code}>
                  <TableCell className="max-w-[18rem] whitespace-normal"><div className="line-clamp-1 text-[13px]">{it?.name ?? l.code}</div><div className="font-mono text-[10px] text-muted-foreground">{l.code} · {it?.uom}</div></TableCell>
                  {!counting && <TableCell className="text-right font-mono text-xs">{l.book}</TableCell>}
                  <TableCell className="text-right">{canCount ? <Input type="number" min={0} inputMode="numeric" className="ml-auto h-8 w-24 text-right font-mono" value={counts[l.code] ?? ""} onChange={(e) => setCounts({ ...counts, [l.code]: e.target.value })} /> : <span className="font-mono text-xs">{l.counted ?? "—"}</span>}</TableCell>
                  {!counting && <><TableCell className={cn("text-right font-mono text-xs font-semibold", v ? "text-destructive" : "text-muted-foreground")}>{v > 0 ? "+" : ""}{v}</TableCell><TableCell className={cn("text-right font-mono text-xs", v ? "text-destructive" : "text-muted-foreground")}>{num(v * (it?.avgCostPkr ?? 0))}</TableCell></>}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!counting && <div className="flex justify-between rounded-lg bg-muted/40 px-4 py-2 text-[13px]"><span>Net variance</span><b className={cn("font-mono", net ? "text-destructive" : "")}>{pkr(net)}</b></div>}
        <DialogFooter className="flex-wrap gap-2">
          {(counting || t.status === "Submitted") && !role.readOnly && <Button variant="ghost" className="mr-auto text-destructive" onClick={() => { if (act(s.cancelStockTake(t.id))) onClose(); }}><X /> Cancel count</Button>}
          {canCount && <Button variant="outline" onClick={() => act(s.saveCounts(t.id, parsed))}>Save ({done}/{t.lines.length})</Button>}
          {canCount && <Button disabled={done < t.lines.length} onClick={() => { if (act(s.saveCounts(t.id, parsed))) act(s.submitStockTake(t.id)); }}><Check /> Submit for approval</Button>}
          {t.status === "Submitted" && s.role === "director" && !role.readOnly && <Button onClick={() => { if (act(s.approveStockTake(t.id))) onClose(); }}><ClipboardCheck /> Approve and post</Button>}
          {t.status === "Submitted" && s.role !== "director" && <span className="text-xs text-muted-foreground">Waiting for the Director to approve.</span>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Dialogs ---------- */
function StoreDialog({ value, onClose }: { value: StoreX | "new" | null; onClose: () => void }) {
  const s = useApp();
  const isNew = value === "new";
  const cur = value && value !== "new" ? value : null;
  const [f, setF] = useState({ name: cur?.name ?? "", city: cur?.city ?? "Faisalabad", type: cur?.type ?? "Regional Store", custodian: cur?.custodian ?? "" });
  if (!value) return null;
  const save = () => {
    const r = isNew ? s.addStore(f) : s.updateStore(cur!.id, { name: f.name, custodian: f.custodian, type: f.type });
    toast[r.ok ? "success" : "error"](r.title, { description: r.message });
    if (r.ok) onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{isNew ? "Add a store" : `Edit ${cur!.id}`}</DialogTitle><DialogDescription>{isNew ? "The new store joins the single ledger straight away and can receive transfers." : "Changes are recorded with their previous values."}</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="sn">Store name</Label><Input id="sn" placeholder="e.g. Iqbal Stadium Sub-store" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="sc">City</Label><Input id="sc" disabled={!isNew} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label>Type</Label><Select value={f.type} onValueChange={(v) => setF({ ...f, type: v })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{["Central Hub", "Regional Store", "Departmental Store", "Sub-store", "High-Performance Hub"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="cu">Custodian</Label><Input id="cu" placeholder="Accountable officer" value={f.custodian} onChange={(e) => setF({ ...f, custodian: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>{isNew ? "Add store" : "Save"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useApp();
  const stores = (s.stadiumStores as StoreX[]).filter((x) => (x.status ?? "Active") === "Active");
  const items = s.itemsMaster.filter(isActive);
  const [code, setCode] = useState(items[0]?.code ?? "");
  const [from, setFrom] = useState("STORE-LHR-01");
  const [to, setTo] = useState("STORE-KHI-01");
  const [qty, setQty] = useState(5);
  const [reason, setReason] = useState("Match-day allocation");
  const item = s.itemsMaster.find((i) => i.code === code);
  const free = item ? (from === "STORE-LHR-01" ? available(item) : item.storeBreakdown[from] ?? 0) : 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Transfer stock between stores</DialogTitle><DialogDescription>Traceable by Item Code; the receiving custodian confirms arrival.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid gap-1.5"><Label>Item</Label><Select value={code} onValueChange={setCode}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{items.map((i) => <SelectItem key={i.code} value={i.code}>{i.name.slice(0, 44)}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label>From <span className="font-normal text-muted-foreground">({free} free)</span></Label><Select value={from} onValueChange={setFrom}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{stores.map((x) => <SelectItem key={x.id} value={x.id}>{short(x.name)}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label>To</Label><Select value={to} onValueChange={setTo}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{stores.map((x) => <SelectItem key={x.id} value={x.id}>{short(x.name)}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label htmlFor="tq">Quantity</Label><Input id="tq" type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="tr">Reason</Label><Input id="tr" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        {from === "STORE-LHR-01" && (item?.reserved ?? 0) > 0 && <p className="text-xs text-gold-text">{item!.reserved} units are reserved for demands and cannot be transferred.</p>}
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => { if (from === "STORE-LHR-01" && qty > free) { toast.error("Reserved stock", { description: `Only ${free} are free to move.` }); return; } const r = s.transferStock({ code, from, to, qty, reason }); toast[r.ok ? "success" : "error"](r.title, { description: r.message }); if (r.ok) onOpenChange(false); }}>Authorise transfer</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReturnDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useApp();
  const items = s.itemsMaster.filter(isActive);
  const [code, setCode] = useState(items[0]?.code ?? "");
  const [qty, setQty] = useState(4);
  const [dept, setDept] = useState(DEPTS[0]);
  const [reason, setReason] = useState("Unused after camp");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Receive a return</DialogTitle><DialogDescription>Unused or returned items go back into Gaddafi Central and onto the ledger.</DialogDescription></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 grid gap-1.5"><Label>Item</Label><Select value={code} onValueChange={setCode}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{items.map((i) => <SelectItem key={i.code} value={i.code}>{i.name.slice(0, 44)}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label>Returned by</Label><Select value={dept} onValueChange={setDept}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{DEPTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label htmlFor="rq">Quantity</Label><Input id="rq" type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} /></div>
          <div className="col-span-2 grid gap-1.5"><Label htmlFor="rr">Reason</Label><Input id="rr" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={() => { const r = s.returnToStore({ code, qty, dept, reason }); toast[r.ok ? "success" : "error"](r.title, { description: r.message }); if (r.ok) onOpenChange(false); }}>Receive into store</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
