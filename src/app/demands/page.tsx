"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "motion/react";
import { AlertTriangle, ArrowRight, Ban, Check, ClipboardList, Clock, Layers, Lock, MoreHorizontal, PackageCheck, Pencil, Plus, Search, Send, ShoppingCart, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Empty, KpiGrid, Meter, PageHeader, Section, Status, Stepper, type Tone } from "@/components/dash";
import { useApp, useRole } from "@/lib/store";
import { available, isActive } from "@/lib/engine-stores";
import { fmtD, num, parseD, pkr, TODAY } from "@/lib/domain";
import type { Demand } from "@/lib/types";
import { cn } from "@/lib/utils";

const DEPTS = ["High Performance Centre", "Grounds & Pitches", "Men's National Team", "Women's National Team", "PSL Operations", "Domestic Cricket Operations", "Medical & Sports Science"];
type View = "open" | "issue" | "procurement" | "closed" | "all";
const closed = (d: Demand) => ["Fulfilled from stock", "Cancelled", "PR rejected"].includes(d.status);
const tone = (st: string): Tone => (st === "Fulfilled from stock" ? "success" : st === "Cancelled" || st === "PR rejected" ? "neutral" : st.startsWith("Reserved") ? "gold" : st.includes("approved") || st.includes("sourcing") ? "info" : "warning");
const stageOf = (d: Demand) => (d.status === "Cancelled" ? -1 : d.status === "Fulfilled from stock" ? 4 : d.issued > 0 ? 3 : d.status.includes("approved") || d.status.includes("sourcing") ? 3 : 2);

export default function DemandsPage() {
  return <Suspense><Demands /></Suspense>;
}

function Demands() {
  const s = useApp();
  const role = useRole();
  const params = useSearchParams();
  const router = useRouter();
  const canRaise = !role.readOnly;
  const isStore = ["storekeeper", "director"].includes(s.role) && !role.readOnly;
  const [view, setView] = useState<View>("open");
  const [q, setQ] = useState("");
  const [raise, setRaise] = useState(params.get("new") === "1");
  const [edit, setEdit] = useState<Demand | null>(null);
  const [cancel, setCancel] = useState<Demand | null>(null);
  const openId = params.get("id");
  const setOpen = (id: string | null) => router.replace(id ? `/demands/?id=${id}` : "/demands/", { scroll: false });

  const queue = s.demands.filter((d) => (d.reserved ?? 0) > 0);
  const inProc = s.demands.filter((d) => d.prQty > 0 && !closed(d));
  const list = s.demands.filter((d) => {
    if (view === "open" && closed(d)) return false;
    if (view === "issue" && !(d.reserved ?? 0)) return false;
    if (view === "procurement" && !(d.prQty > 0 && !closed(d))) return false;
    if (view === "closed" && !closed(d)) return false;
    const t = q.trim().toLowerCase();
    const it = s.itemsMaster.find((i) => i.code === d.itemCode);
    return !t || `${d.id} ${d.dept} ${d.by} ${d.itemCode} ${it?.name ?? ""} ${d.pr ?? ""} ${d.sin ?? ""}`.toLowerCase().includes(t);
  });
  const fromStock = s.demands.filter((d) => d.issued > 0 || (d.reserved ?? 0) > 0).length;

  const consolidated = useMemo(() => {
    const m = new Map<string, { code: string; qty: number; depts: Set<string>; ids: string[] }>();
    s.demands.filter((d) => d.prQty > 0 && !closed(d)).forEach((d) => {
      const x = m.get(d.itemCode) ?? { code: d.itemCode, qty: 0, depts: new Set<string>(), ids: [] };
      x.qty += d.prQty; x.depts.add(d.dept); x.ids.push(d.id); m.set(d.itemCode, x);
    });
    return [...m.values()].sort((a, b) => b.qty - a.qty);
  }, [s.demands]);

  const issue = (d: Demand) => { const r = s.issueDemand(d.id); toast[r.ok ? "success" : "error"](r.title, { description: r.message }); };

  return (
    <>
      <PageHeader module="Stores" title="Demands" description="Every request starts here. The system checks stock, reserves what is available so nobody else can take it, and sends any shortfall to Procurement under the same number."
        actions={canRaise && <Button onClick={() => setRaise(true)}><Plus /> Raise a demand</Button>} />

      <KpiGrid items={[
        { label: "Open demands", value: s.demands.filter((d) => !closed(d)).length, icon: ClipboardList, hero: true, foot: `${s.demands.length} on record` },
        { label: "Ready to issue", value: queue.length, icon: PackageCheck, foot: `${queue.reduce((a, d) => a + (d.reserved ?? 0), 0)} units reserved in store` },
        { label: "With Procurement", value: inProc.length, icon: ShoppingCart, foot: "Shortfall sent as requisitions", href: "/approvals/" },
        { label: "Served from stock", value: s.demands.length ? Math.round((fromStock / s.demands.length) * 100) : 0, suffix: "%", icon: Check, foot: "No purchase needed" },
      ]} />

      {isStore && queue.length > 0 && (
        <Section className="mb-6 border-l-2 border-l-gold" title="Ready to issue" description="Stock is reserved for these demands. Hand it over and post the issue." contentClassName="px-5 pb-5">
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {queue.map((d, i) => {
              const it = s.itemsMaster.find((x) => x.code === d.itemCode);
              return (
                <motion.li key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><div className="font-mono text-xs font-semibold">{d.id}</div><div className="truncate text-[13px] font-medium">{it?.name ?? d.itemCode}</div><div className="text-xs text-muted-foreground">{d.dept} · {d.by}</div></div>
                    <Status tone="gold" icon={Lock}>{d.reserved} reserved</Status>
                  </div>
                  <div className="flex items-center justify-between gap-2"><span className="text-[11px] text-muted-foreground">Needed by {d.requiredBy}</span><Button size="sm" onClick={() => issue(d)}><PackageCheck /> Issue {d.reserved}</Button></div>
                </motion.li>
              );
            })}
          </ul>
        </Section>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Section title="Demand register" description="Every demand keeps its permanent number, including those served from stock." flush className="self-start"
          action={<Tabs value={view} onValueChange={(v) => setView(v as View)}><TabsList className="h-auto flex-wrap"><TabsTrigger value="open">Open</TabsTrigger><TabsTrigger value="issue">To issue</TabsTrigger><TabsTrigger value="procurement">Procurement</TabsTrigger><TabsTrigger value="closed">Closed</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList></Tabs>}>
          <div className="px-5 pb-4"><div className="relative"><Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search demand, department, person, item, PR…" value={q} onChange={(e) => setQ(e.target.value)} /></div></div>
          <Table>
            <TableHeader><TableRow><TableHead className="pl-5">Demand</TableHead><TableHead>Item</TableHead><TableHead>Outcome</TableHead><TableHead>Needed by</TableHead><TableHead>Status</TableHead><TableHead className="pr-5" /></TableRow></TableHeader>
            <TableBody>
              {list.map((d) => {
                const it = s.itemsMaster.find((i) => i.code === d.itemCode);
                const late = !closed(d) && d.requiredBy !== "—" && parseD(d.requiredBy) < TODAY;
                const mine = d.by === role.user || s.role === "director";
                return (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => setOpen(d.id)}>
                    <TableCell className="pl-5"><div className="font-mono text-xs font-semibold">{d.id}</div><div className="text-[11px] text-muted-foreground">{d.date} · {d.dept}</div></TableCell>
                    <TableCell className="max-w-[16rem] whitespace-normal"><div className="line-clamp-1 text-[13px]">{it?.name ?? d.itemCode}</div><div className="text-[11px] text-muted-foreground">Qty {d.qty} · {d.by}</div></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">
                      {d.issued > 0 && <Status tone="success" icon={null}>{d.issued} issued</Status>}
                      {(d.reserved ?? 0) > 0 && <Status tone="gold" icon={null}>{d.reserved} reserved</Status>}
                      {d.prQty > 0 && <Status tone="warning" icon={null}>{d.prQty} to buy</Status>}
                    </div></TableCell>
                    <TableCell className={cn("text-xs", late && "font-semibold text-destructive")}>{d.requiredBy}</TableCell>
                    <TableCell><Status tone={tone(d.status)}>{d.status}</Status></TableCell>
                    <TableCell className="pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => setOpen(d.id)}><ClipboardList /> Open</DropdownMenuItem>
                          {isStore && (d.reserved ?? 0) > 0 && <DropdownMenuItem onClick={() => issue(d)}><PackageCheck /> Issue from store</DropdownMenuItem>}
                          {!closed(d) && mine && !role.readOnly && <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEdit(d)}><Pencil /> Edit</DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={() => setCancel(d)}><Ban /> Cancel demand</DropdownMenuItem>
                          </>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!list.length && <TableRow><TableCell colSpan={6}><Empty>No demands in this view.</Empty></TableCell></TableRow>}
            </TableBody>
          </Table>
        </Section>

        <Section title="Combined requirement" description="Shortfalls across departments, grouped by item so Procurement buys once." className="self-start">
          {consolidated.length ? (
            <ul className="grid gap-3">
              {consolidated.map((c) => {
                const it = s.itemsMaster.find((i) => i.code === c.code);
                return (
                  <li key={c.code} className="rounded-lg border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-[13px] font-semibold">{it?.name ?? c.code}</div><div className="font-mono text-[11px] text-muted-foreground">{c.code}</div></div><span className="font-mono text-lg font-semibold">{c.qty}</span></div>
                    <div className="mt-1 text-[11px] text-muted-foreground">{[...c.depts].join(", ")} · {c.ids.join(", ")}</div>
                    <div className="mt-1 text-[11px]">≈ {pkr(c.qty * (it?.avgCostPkr ?? 0))}</div>
                  </li>
                );
              })}
            </ul>
          ) : <Empty>No shortfall waiting for Procurement.</Empty>}
        </Section>
      </div>

      <DemandDetail id={openId} onClose={() => setOpen(null)} onEdit={setEdit} onCancel={setCancel} />
      <RaiseDialog open={raise} onOpenChange={(o) => { setRaise(o); if (!o && params.get("new")) router.replace("/demands/", { scroll: false }); }} onDone={(id) => setOpen(id)} />
      <EditDialog key={edit?.id ?? "e"} d={edit} onClose={() => setEdit(null)} />
      <CancelDialog d={cancel} onClose={() => setCancel(null)} />
    </>
  );
}

/* ---------- Raise ---------- */
function RaiseDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: (id: string) => void }) {
  const s = useApp();
  const role = useRole();
  const items = s.itemsMaster.filter(isActive);
  const [dept, setDept] = useState(DEPTS[0]);
  const [code, setCode] = useState(items[0]?.code ?? "");
  const [qty, setQty] = useState(50);
  const [date, setDate] = useState(() => { const d = new Date(TODAY); d.setDate(d.getDate() + 14); return d.toISOString().slice(0, 10); });
  const [purpose, setPurpose] = useState("NCA pre-season camp");
  const [headId, setHeadId] = useState<string | null>(null);
  const item = items.find((i) => i.code === code) ?? items[0];
  if (!item) return null;
  const defaultHead = item.budgetType === "CapEx" ? (code.includes("BRD") ? "BH-CAP-BRD" : "BH-CAP-INF") : code.includes("TRF") ? "BH-OPX-GRD" : "BH-OPX-CRK";
  const head = s.budgetHeads.find((b) => b.id === (headId ?? defaultHead)) ?? s.budgetHeads[0];
  const avail = available(item);
  const n = Math.max(0, Math.floor(qty || 0));
  const reserve = Math.min(avail, n), pr = n - reserve;
  const prValue = pr * item.avgCostPkr;
  const headAvail = head.allocation - head.committed;
  const over = pr > 0 && prValue > headAvail;
  const submit = () => {
    const r = s.submitDemand({ dept, itemCode: item.code, qty: n, requiredBy: date ? fmtD(new Date(date)) : "—", purpose, budgetHead: head.id });
    if (!r.ok) { toast.error(r.title, { description: r.message }); return; }
    toast.success(r.title, { description: r.message });
    onOpenChange(false);
    onDone(r.detail.id);
  };
  const pct = n ? (reserve / n) * 100 : 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Raise a demand</DialogTitle><DialogDescription>Requested by {role.user} · {role.label}</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2"><Label>Item</Label><Select value={item.code} onValueChange={(v) => { setCode(v); setHeadId(null); }}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{items.map((i) => <SelectItem key={i.code} value={i.code}><span className="font-mono text-xs">{i.code}</span> {i.name.slice(0, 44)}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label>Department</Label><Select value={dept} onValueChange={setDept}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{DEPTS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label htmlFor="qty">Quantity ({item.uom})</Label><Input id="qty" type="number" min={1} value={qty} onChange={(e) => setQty(+e.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="rb">Needed by</Label><Input id="rb" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Budget head</Label><Select value={head.id} onValueChange={setHeadId}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{s.budgetHeads.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="pp">Purpose</Label><Input id="pp" value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
        </div>

        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[13px]"><span className="font-semibold">Live stock check · Gaddafi Central</span><span className="text-xs text-muted-foreground">{item.storeBreakdown["STORE-LHR-01"] ?? 0} in store · {item.reserved ?? 0} already reserved · <b className="text-foreground">{avail} free</b></span></div>
          <div className="flex h-3 overflow-hidden rounded-full bg-muted">
            <motion.div className="h-full bg-gold" animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
            <motion.div className="h-full bg-warning/70" animate={{ width: `${n ? 100 - pct : 0}%` }} transition={{ duration: 0.4 }} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className={cn("rounded-lg border p-3", reserve ? "border-gold/50 bg-gold/8" : "opacity-50")}><div className="flex items-center gap-1.5 text-xs font-semibold"><Lock className="size-3.5 text-gold-text" />{reserve} reserved from stock</div><p className="mt-0.5 text-[11px] text-muted-foreground">Held for this demand so no one else can take it, until the store issues it.</p></div>
            <div className={cn("rounded-lg border p-3", pr ? "border-warning/40 bg-warning/8" : "opacity-50")}><div className="flex items-center gap-1.5 text-xs font-semibold"><ShoppingCart className="size-3.5 text-warning" />{pr} sent to Procurement</div><p className="mt-0.5 text-[11px] text-muted-foreground">{pr ? `Requisition of about ${pkr(prValue)} for approval, under the same demand number.` : "Nothing to buy."}</p></div>
          </div>
          {pr > 0 && (over
            ? <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-destructive"><Wallet className="size-3.5" />Not enough budget on {head.name}: {pkr(headAvail)} left, {pkr(prValue)} needed.</p>
            : <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Wallet className="size-3.5" />Budget check passed: {pkr(headAvail)} uncommitted on {head.name}.</p>)}
          {head.type !== item.budgetType && <p className="mt-1 flex items-center gap-1.5 text-xs text-warning"><AlertTriangle className="size-3.5" />This item is {item.budgetType}; the budget head is {head.type}.</p>}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={n < 1 || over || !purpose.trim()} onClick={submit}><Send /> Submit demand</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Detail ---------- */
function DemandDetail({ id, onClose, onEdit, onCancel }: { id: string | null; onClose: () => void; onEdit: (d: Demand) => void; onCancel: (d: Demand) => void }) {
  const s = useApp();
  const role = useRole();
  const d = s.demands.find((x) => x.id === id);
  const it = s.itemsMaster.find((i) => i.code === d?.itemCode);
  const apr = s.approvals.find((a) => a.demandId === d?.id || (d?.pr && a.ref === d.pr));
  const head = s.budgetHeads.find((b) => b.id === d?.budgetHead);
  const isStore = ["storekeeper", "director"].includes(s.role) && !role.readOnly;
  const mine = d && (d.by === role.user || s.role === "director") && !role.readOnly;
  const at = d ? stageOf(d) : 0;
  return (
    <Dialog open={!!d} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        {d && <>
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2"><span className="font-mono">{d.id}</span><Status tone={tone(d.status)}>{d.status}</Status></DialogTitle>
            <DialogDescription>{d.qty} × {it?.name ?? d.itemCode} for {d.dept}</DialogDescription>
          </DialogHeader>
          {d.status === "Cancelled" ? <div className="flex gap-2 rounded-lg border border-muted bg-muted/40 p-3 text-xs"><X className="size-4" />Cancelled: {d.cancelReason}</div>
            : <Stepper steps={["Raised", "Stock checked", d.branch === "none" ? "Requisition" : "Reserved", "Issued / approved", "Complete"]} at={at} />}
          <div className="grid grid-cols-3 gap-2 text-center">
            {[["Issued", d.issued, "success"], ["Reserved", d.reserved ?? 0, "gold"], ["To buy", d.prQty, "warning"]].map(([k, v, t]) => (
              <div key={k as string} className="rounded-lg border bg-muted/30 p-3"><div className="text-[11px] text-muted-foreground">{k}</div><div className={cn("font-mono text-2xl font-semibold", Number(v) > 0 && (t === "success" ? "text-success" : t === "gold" ? "text-gold-text" : "text-warning"))}>{v}</div></div>
            ))}
          </div>
          <div className="grid gap-x-6 gap-y-2 rounded-lg border p-4 text-[13px] sm:grid-cols-2">
            {[["Requested by", d.by], ["Raised on", d.date], ["Needed by", d.requiredBy], ["Budget head", head?.name ?? d.budgetHead], ["Purpose", d.purpose], ["Item code", d.itemCode], ["Store issue", d.sin ?? "—"], ["Requisition", d.pr ?? "—"]].map(([k, v]) => (
              <div key={k} className="min-w-0"><div className="text-[11px] text-muted-foreground">{k}</div><div className="break-words">{v}</div></div>
            ))}
          </div>
          {apr && (
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between text-[13px] font-semibold"><span>Requisition approval · {apr.id}</span><Button size="sm" variant="ghost" asChild><Link href={`/approvals/?id=${apr.id}`}>Open <ArrowRight /></Link></Button></div>
              <div className="flex flex-wrap gap-2">{apr.chain.map((c, i) => <Status key={i} tone={c.status === "approved" ? "success" : c.status === "pending" ? "warning" : c.status === "waiting" ? "neutral" : "danger"} icon={c.status === "approved" ? Check : c.status === "pending" ? Clock : null}>{c.role}</Status>)}</div>
            </div>
          )}
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">History</div>
            <ol className="relative grid gap-3 border-l pl-4">
              {(d.timeline ?? []).map((t, i) => (
                <li key={i} className="relative text-[13px]"><span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-background bg-primary" /><div>{t.text}</div><div className="text-[11px] text-muted-foreground">{t.at} · {t.by}</div></li>
              ))}
            </ol>
          </div>
          {d.status !== "Cancelled" && (
            <DialogFooter className="flex-wrap gap-2 sm:justify-start">
              {isStore && (d.reserved ?? 0) > 0 && <Button onClick={() => { const r = s.issueDemand(d.id); toast[r.ok ? "success" : "error"](r.title, { description: r.message }); }}><PackageCheck /> Issue {d.reserved} from store</Button>}
              {mine && !closed(d) && <Button variant="outline" onClick={() => onEdit(d)}><Pencil /> Edit</Button>}
              {mine && !closed(d) && <Button variant="outline" className="text-destructive" onClick={() => onCancel(d)}><Ban /> Cancel</Button>}
              <Button variant="ghost" asChild><Link href={`/trace/?code=${d.itemCode}`}><Layers /> Track item</Link></Button>
            </DialogFooter>
          )}
          {it && <div className="flex items-center gap-2 text-[11px] text-muted-foreground"><Meter value={Math.min(100, (it.totalStock / Math.max(1, it.reorderLevel * 3)) * 100)} className="w-24" />{num(it.totalStock)} in stock across stores · {available(it)} free at Gaddafi Central</div>}
        </>}
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ d, onClose }: { d: Demand | null; onClose: () => void }) {
  const s = useApp();
  const iso = (x?: string) => { try { if (!x || x === "—") return ""; const t = parseD(x); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; } catch { return ""; } };
  const [date, setDate] = useState(iso(d?.requiredBy));
  const [purpose, setPurpose] = useState(d?.purpose ?? "");
  const [head, setHead] = useState(d?.budgetHead ?? "");
  if (!d) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Edit {d.id}</DialogTitle><DialogDescription>Quantity and item are fixed once stock is reserved. To change them, cancel and raise a new demand.</DialogDescription></DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5"><Label htmlFor="ed">Needed by</Label><Input id="ed" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label>Budget head</Label><Select value={head} onValueChange={setHead}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{s.budgetHeads.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label htmlFor="ep">Purpose</Label><Textarea id="ep" value={purpose} onChange={(e) => setPurpose(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => { const r = s.updateDemand(d.id, { requiredBy: date ? fmtD(new Date(date)) : d.requiredBy, purpose, budgetHead: head }); toast[r.ok ? "success" : "error"](r.title, { description: r.message }); if (r.ok) onClose(); }}>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({ d, onClose }: { d: Demand | null; onClose: () => void }) {
  const s = useApp();
  const [reason, setReason] = useState("Requirement no longer needed");
  return (
    <Dialog open={!!d} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Cancel {d?.id}</DialogTitle><DialogDescription>{d && (d.reserved ?? 0) > 0 ? `${d.reserved} reserved units go back to available stock. ` : ""}{d?.prQty ? "The requisition is withdrawn from approval. " : ""}The demand stays on record as cancelled.</DialogDescription></DialogHeader>
        <div className="grid gap-1.5"><Label htmlFor="cr">Reason</Label><Textarea id="cr" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Keep demand</Button><Button variant="destructive" onClick={() => { const r = s.cancelDemand(d!.id, reason); toast[r.ok ? "success" : "error"](r.title, { description: r.message }); if (r.ok) onClose(); }}>Cancel demand</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
