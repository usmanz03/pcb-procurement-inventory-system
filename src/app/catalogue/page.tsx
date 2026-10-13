"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "motion/react";
import { AlertTriangle, ArrowRight, Ban, Boxes, Check, CheckCircle2, Clock, Copy, Eye, History, Link2, MoreHorizontal, Package, Pencil, Plus, QrCode, RotateCcw, Search, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AreaTrend, Empty, KpiGrid, PageHeader, Section, Stat, Status } from "@/components/dash";
import { QrLabelDialog } from "@/components/qr-label";
import { TYPE_LABEL, TYPE_TONE } from "@/components/item-sheet";
import { useApp, useRole } from "@/lib/store";
import { available, CATEGORY_NAMES, costHistory } from "@/lib/engine-stores";
import { computeLedger, FAR_FUTURE, mil, num, pkr } from "@/lib/domain";
import type { Item } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "Active" | "pending" | "Inactive";
const SUBS: Record<string, [string, string][]> = {
  SPO: [["BALL", "Balls"], ["BAT", "Bats"], ["PAD", "Protective gear"], ["NET", "Nets & practice"], ["SEN", "Sensors"]],
  INF: [["LGT", "Floodlighting"], ["SCR", "Scoreboards"], ["SEA", "Seating"], ["ELE", "Electrical"]],
  TRF: [["MOW", "Mowers"], ["ROL", "Rollers"], ["COV", "Covers"], ["SED", "Seed & fertiliser"]],
  APP: [["KIT", "Match kits"], ["TRN", "Training wear"], ["CAP", "Caps & helmets"]],
  MED: [["REC", "Recovery"], ["FAK", "First aid"], ["DIA", "Diagnostics"]],
  BRD: [["HWK", "Ball tracking"], ["CAM", "Cameras"], ["AUD", "Audio"]],
  STA: [["PAP", "Paper"], ["PRN", "Printing"]],
  ITE: [["LAP", "Laptops"], ["TAB", "Tablets"], ["NWK", "Networking"]],
};

export default function CataloguePage() {
  return <Suspense><Catalogue /></Suspense>;
}

function Catalogue() {
  const s = useApp();
  const role = useRole();
  const params = useSearchParams();
  const router = useRouter();
  const canEdit = !role.readOnly && ["director", "storekeeper"].includes(s.role);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [newOpen, setNewOpen] = useState(params.get("new") === "1");
  const [edit, setEdit] = useState<Item | null>(null);
  const [retire, setRetire] = useState<Item | null>(null);
  const [legacy, setLegacy] = useState<Item | null>(null);
  const [qr, setQr] = useState<Item | null>(null);
  const view = params.get("code");
  const setView = (code: string | null) => router.replace(code ? `/catalogue/?code=${code}` : "/catalogue/", { scroll: false });

  const pending = s.approvals.filter((a) => a.type === "Item Code Request" && a.status === "pending");
  const value = s.itemsMaster.reduce((a, i) => a + i.totalStock * i.avgCostPkr, 0);
  const cats = [...new Set(s.itemsMaster.map((i) => i.categoryCode))];
  const rows = s.itemsMaster.filter((i) => {
    const st = i.status ?? "Active";
    if (status === "Active" && st !== "Active") return false;
    if (status === "Inactive" && st !== "Inactive") return false;
    if (status === "pending" && st !== "Deactivation pending") return false;
    if (cat !== "all" && i.categoryCode !== cat) return false;
    const t = q.trim().toLowerCase();
    return !t || `${i.code} ${i.name} ${i.category} ${i.subCategory} ${(i.legacyCodes ?? []).join(" ")}`.toLowerCase().includes(t);
  });

  return (
    <>
      <PageHeader module="Master data" title="Item master" description="The one catalogue every demand, tender, order and receipt draws from. New codes are approved before use, and a code is never reused."
        actions={canEdit && <Button onClick={() => setNewOpen(true)}><Plus /> New item code</Button>} />

      <KpiGrid items={[
        { label: "Active item codes", value: s.itemsMaster.filter((i) => (i.status ?? "Active") === "Active").length, icon: Boxes, hero: true, foot: `${s.itemsMaster.length} codes on record, none reused` },
        { label: "Codes awaiting approval", value: pending.length, icon: Clock, foot: pending.length ? pending.map((a) => a.ref).join(", ") : "Nothing pending", href: "/approvals/" },
        { label: "Value on hand", prefix: "PKR", value: value / 1e6, decimals: 1, suffix: "M", icon: Wallet, foot: "At weighted average cost" },
        { label: "Assets tracked by tag", value: s.itemsMaster.filter((i) => i.classification.includes("Asset")).length, icon: ShieldCheck, foot: `${s.itemsMaster.filter((i) => !i.classification.includes("Asset")).length} consumables by quantity` },
      ]} />

      {pending.length > 0 && (
        <Section className="mb-6 border-l-2 border-l-gold" title="New codes awaiting approval" description="Requested codes become usable only after the Director approves them." contentClassName="px-5 pb-4">
          <ul className="grid gap-2 md:grid-cols-2">
            {pending.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                <div className="min-w-0"><div className="font-mono text-xs font-semibold">{a.ref}</div><div className="truncate text-[13px]">{a.title.replace("New code: ", "")}</div><div className="text-[11px] text-muted-foreground">Requested by {a.requestedBy} · {a.submitted}</div></div>
                <Button size="sm" variant="outline" asChild><Link href={`/approvals/?id=${a.id}`}>Review <ArrowRight /></Link></Button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Catalogue" description="Select an item to see its full record, cost history and movements." flush
        action={<Tabs value={status} onValueChange={(v) => setStatus(v as StatusFilter)}><TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="Active">Active</TabsTrigger><TabsTrigger value="pending">Retiring</TabsTrigger><TabsTrigger value="Inactive">Inactive</TabsTrigger></TabsList></Tabs>}>
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          <div className="relative min-w-[14rem] flex-1"><Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search code, description or old code…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Select value={cat} onValueChange={setCat}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{cats.map((c) => <SelectItem key={c} value={c}>{CATEGORY_NAMES[c] ?? c}</SelectItem>)}</SelectContent></Select>
        </div>
        <Table>
          <TableHeader><TableRow><TableHead className="pl-5">Item</TableHead><TableHead>Category</TableHead><TableHead>Type</TableHead><TableHead className="text-right">In stock</TableHead><TableHead className="text-right">Available</TableHead><TableHead className="text-right">Avg cost</TableHead><TableHead>Status</TableHead><TableHead className="pr-5" /></TableRow></TableHeader>
          <TableBody>
            {rows.map((i) => {
              const st = i.status ?? "Active";
              const low = i.totalStock <= i.reorderLevel && st === "Active";
              return (
                <TableRow key={i.code} className="cursor-pointer" onClick={() => setView(i.code)}>
                  <TableCell className="max-w-[22rem] pl-5 whitespace-normal">
                    <div className="text-[13px] font-semibold">{i.name}</div>
                    <div className="font-mono text-[11px] text-muted-foreground">{i.code}{i.legacyCodes?.length ? <span className="ml-1.5 text-muted-foreground/70">· was {i.legacyCodes.join(", ")}</span> : null}</div>
                  </TableCell>
                  <TableCell className="text-xs"><div>{i.category}</div><div className="text-muted-foreground">{i.subCategory}</div></TableCell>
                  <TableCell><div className="flex flex-wrap gap-1"><Status tone="neutral" icon={null}>{i.classification.includes("Asset") ? "Asset" : "Consumable"}</Status><Status tone="neutral" icon={null}>{i.budgetType}</Status></div></TableCell>
                  <TableCell className="text-right font-mono text-[13px] font-semibold tabular">{num(i.totalStock)}<div className="text-[10px] font-normal text-muted-foreground">{i.uom}</div></TableCell>
                  <TableCell className="text-right font-mono text-[13px] tabular">{num(available(i))}{(i.reserved ?? 0) > 0 && <div className="text-[10px] text-gold-text">{i.reserved} reserved</div>}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular">{num(i.avgCostPkr)}</TableCell>
                  <TableCell>{st === "Active" ? (low ? <Status tone="warning">Re-order</Status> : <Status tone="success">Active</Status>) : st === "Inactive" ? <Status tone="neutral" icon={Ban}>Inactive</Status> : <Status tone="warning" icon={Clock}>Retiring</Status>}</TableCell>
                  <TableCell className="pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button size="icon" variant="ghost" aria-label="Actions"><MoreHorizontal /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => setView(i.code)}><Eye /> View full record</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setQr(i)}><QrCode /> Print label</DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href={`/trace/?code=${i.code}`}><History /> Track this item</Link></DropdownMenuItem>
                        {canEdit && <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEdit(i)}><Pencil /> Edit details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setLegacy(i)}><Link2 /> Map an old code</DropdownMenuItem>
                          {st === "Active" && <DropdownMenuItem variant="destructive" onClick={() => setRetire(i)}><Ban /> Retire this code</DropdownMenuItem>}
                          {st === "Inactive" && s.role === "director" && <DropdownMenuItem onClick={() => { const r = s.reactivateItem(i.code); toast[r.ok ? "success" : "error"](r.title, { description: r.message }); }}><RotateCcw /> Reactivate</DropdownMenuItem>}
                        </>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {!rows.length && <TableRow><TableCell colSpan={8}><Empty>No items match.</Empty></TableCell></TableRow>}
          </TableBody>
        </Table>
      </Section>

      <ItemDetail code={view} onClose={() => setView(null)} onEdit={setEdit} onLegacy={setLegacy} onLabel={setQr} canEdit={canEdit} />
      <NewCodeDialog open={newOpen} onOpenChange={setNewOpen} />
      <EditDialog key={edit?.code ?? "e"} item={edit} onClose={() => setEdit(null)} />
      <RetireDialog item={retire} onClose={() => setRetire(null)} />
      <LegacyDialog item={legacy} onClose={() => setLegacy(null)} />
      <QrLabelDialog code={qr?.code ?? null} title={qr?.name} sub={qr ? `${qr.category} · ${qr.uom}` : undefined} onClose={() => setQr(null)} />
    </>
  );
}

/* ---------- Item record ---------- */
function ItemDetail({ code, onClose, onEdit, onLegacy, onLabel, canEdit }: { code: string | null; onClose: () => void; onEdit: (i: Item) => void; onLegacy: (i: Item) => void; onLabel: (i: Item) => void; canEdit: boolean }) {
  const s = useApp();
  const item = s.itemsMaster.find((i) => i.code === code);
  const [tab, setTab] = useState("overview");
  const hist = useMemo(() => (code ? costHistory(s, code) : []), [s, code]);
  const L = code ? s.itemLedgers[code] : undefined;
  const moves = L ? computeLedger(L, new Date(2000, 0, 1), FAR_FUTURE).rows.slice().reverse() : [];
  const attrs = code ? s.assetAttributes[code] : undefined;
  const last = hist[hist.length - 1];
  return (
    <Sheet open={!!item} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        {item && <>
          <SheetHeader className="border-b pb-4">
            <SheetDescription className="font-mono text-xs">{item.code}{item.legacyCodes?.length ? ` · formerly ${item.legacyCodes.join(", ")}` : ""}</SheetDescription>
            <SheetTitle className="text-xl leading-snug">{item.name}</SheetTitle>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Status tone={(item.status ?? "Active") === "Active" ? "success" : "neutral"}>{item.status ?? "Active"}</Status>
              <Status tone="neutral" icon={null}>{item.classification.includes("Asset") ? "Tracked asset" : "Consumable"}</Status>
              <Status tone="neutral" icon={null}>{item.budgetType}</Status>
              <Status tone="neutral" icon={null}>{item.uom}</Status>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              {canEdit && <Button size="sm" variant="outline" onClick={() => onEdit(item)}><Pencil /> Edit</Button>}
              {canEdit && <Button size="sm" variant="outline" onClick={() => onLegacy(item)}><Link2 /> Map old code</Button>}
              <Button size="sm" variant="outline" onClick={() => onLabel(item)}><QrCode /> Label</Button>
              <Button size="sm" variant="outline" asChild><Link href={`/trace/?code=${item.code}`}><History /> Track</Link></Button>
            </div>
          </SheetHeader>
          <div className="grid gap-5 px-4 pb-8">
            <Tabs value={tab} onValueChange={setTab}><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="cost">Cost history</TabsTrigger><TabsTrigger value="moves">Movements</TabsTrigger></TabsList></Tabs>
            {tab === "overview" && <>
              <div className="grid grid-cols-2 gap-3">
                <Stat label="In stock" value={num(item.totalStock)} sub={`${available(item)} available · ${item.reserved ?? 0} reserved`} />
                <Stat label="Re-order level" value={num(item.reorderLevel)} sub={item.totalStock <= item.reorderLevel ? "At or below: re-order" : "Stock is healthy"} tone={item.totalStock <= item.reorderLevel ? "warning" : undefined} />
                <Stat label="Average cost" value={pkr(item.avgCostPkr)} sub="Recalculated on every receipt" />
                <Stat label="Last purchase" value={last ? pkr(last.price) : "—"} sub={last ? `${last.date} · ${last.vendor.split(" (")[0]}` : "No receipts yet"} />
              </div>
              <div className="grid gap-x-6 gap-y-2 rounded-lg border p-4 text-[13px] sm:grid-cols-2">
                {[["Category", item.category], ["Sub-category", item.subCategory], ["Specification", item.spec || "—"], ["Shelf life", item.shelfLife], ...(attrs ? [["Warranty", attrs.warranty], ["Useful life", attrs.usefulLife], ["Depreciation", attrs.depreciation]] : []), ["Created", item.createdOn ?? "Migrated 01-Jul-2026"]].map(([k, v]) => (
                  <div key={k} className="min-w-0"><div className="text-[11px] text-muted-foreground">{k}</div><div className="break-words">{v}</div></div>
                ))}
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock by store</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {s.stadiumStores.map((st) => (
                    <div key={st.id} className="rounded-lg border bg-muted/30 p-2.5">
                      <div className="truncate text-[11px] text-muted-foreground">{st.name.replace(" Central Store", "").replace(" Cricket Stadium", "").replace(" Stadium", "")}</div>
                      <div className="font-mono text-lg font-semibold tabular">{item.storeBreakdown[st.id] ?? 0}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>}
            {tab === "cost" && (hist.length ? <>
              <AreaTrend data={hist.map((h) => ({ d: h.date.slice(0, 6), price: h.price, wac: Math.round(h.wac) }))} xKey="d" series={[{ key: "price", label: "Purchase price", color: "var(--chart-4)" }, { key: "wac", label: "Average cost", color: "var(--chart-1)", area: true }]} valueFormat={(v) => (v >= 1e6 ? mil(v) : `${Math.round(v / 1000)}k`)} height={220} />
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Vendor</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Avg after</TableHead></TableRow></TableHeader>
                <TableBody>{hist.slice().reverse().map((h) => (
                  <TableRow key={h.ref}><TableCell className="text-xs">{h.date}<div className="font-mono text-[10px] text-muted-foreground">{h.po}</div></TableCell><TableCell className="max-w-[10rem] truncate text-xs">{h.vendor}</TableCell><TableCell className="text-right font-mono text-xs">{h.qty}</TableCell><TableCell className="text-right font-mono text-xs">{num(h.price)}</TableCell><TableCell className="text-right font-mono text-xs font-semibold">{num(h.wac)}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            </> : <Empty>No purchases recorded yet. Cost history starts with the first goods receipt.</Empty>)}
            {tab === "moves" && (moves.length ? (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Movement</TableHead><TableHead>Party</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Balance</TableHead></TableRow></TableHeader>
                <TableBody>{moves.map((e, k) => (
                  <TableRow key={e.ref + k}><TableCell className="text-xs">{e.date}<div className="font-mono text-[10px] text-muted-foreground">{e.ref}</div></TableCell><TableCell><Status tone={TYPE_TONE[e.type]} icon={null}>{TYPE_LABEL[e.type]}</Status></TableCell><TableCell className="max-w-[10rem] truncate text-xs">{e.party}</TableCell><TableCell className={cn("text-right font-mono text-xs", e.qty > 0 && "text-success")}>{e.qty > 0 ? "+" : ""}{e.qty}</TableCell><TableCell className="text-right font-mono text-xs font-semibold">{e.balance}</TableCell></TableRow>
                ))}</TableBody>
              </Table>
            ) : <Empty>No movements yet.</Empty>)}
          </div>
        </>}
      </SheetContent>
    </Sheet>
  );
}

/* ---------- New code ---------- */
function NewCodeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useApp();
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ cat: "SPO", sub: "BALL", name: "Kookaburra Turf pink match balls (4-piece)", spec: "156 g, four-piece, day-night", nature: "Consumable" as "Consumable" | "Non-consumable asset", exp: "OpEx" as "OpEx" | "CapEx", uom: "Box (12 pcs)", reorder: 20, shelfLife: "24 months", warranty: "", usefulLife: "", depreciation: "" });
  const subs = SUBS[f.cat] ?? [];
  const subName = subs.find(([k]) => k === f.sub)?.[1] ?? f.sub;
  const prefix = `PCB-${f.cat}-${f.sub}-`;
  const used = [...s.itemsMaster.map((i) => i.code), ...s.approvals.filter((a) => a.type === "Item Code Request").map((a) => a.ref)].filter((c) => c.startsWith(prefix)).map((c) => parseInt(c.slice(-4), 10));
  const code = `${prefix}${String(Math.max(0, ...used) + 1).padStart(4, "0")}`;
  const words = f.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const similar = s.itemsMaster.map((i) => ({ i, score: words.length ? words.filter((w) => i.name.toLowerCase().includes(w)).length / words.length : 0 })).filter((x) => x.score >= 0.34).sort((a, b) => b.score - a.score).slice(0, 3);
  const exact = s.itemsMaster.find((i) => i.name.toLowerCase() === f.name.trim().toLowerCase());
  const asset = f.nature === "Non-consumable asset";
  const reset = () => { setStep(0); onOpenChange(false); };
  const submit = () => {
    const r = s.requestItemCode({ code, name: f.name, category: CATEGORY_NAMES[f.cat], categoryCode: f.cat, subCategory: subName, nature: f.nature, exp: f.exp, uom: f.uom, reorder: f.reorder, spec: f.spec, shelfLife: asset ? undefined : f.shelfLife, warranty: f.warranty, usefulLife: f.usefulLife, depreciation: f.depreciation, dupOf: similar[0]?.i.code });
    if (!r.ok) { toast.error(r.title, { description: r.message }); return; }
    toast.success(r.title, { description: r.message });
    reset();
  };
  const steps = ["Classify", "Describe", "Check & submit"];
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : reset())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>New item code</DialogTitle><DialogDescription>The code is built from the category and checked for duplicates, then sent to the Director for approval.</DialogDescription></DialogHeader>
        <ol className="grid grid-cols-3 gap-2">
          {steps.map((t, i) => (
            <li key={t} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs", i === step ? "border-primary bg-primary/8 font-semibold" : i < step ? "text-foreground" : "text-muted-foreground")}>
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold", i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/20 text-primary" : "bg-muted")}>{i < step ? <Check className="size-3" /> : i + 1}</span>{t}
            </li>
          ))}
        </ol>
        <motion.div key={step} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="grid gap-4">
          {step === 0 && <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5"><Label>Category</Label><Select value={f.cat} onValueChange={(v) => setF({ ...f, cat: v, sub: SUBS[v]?.[0]?.[0] ?? "" })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CATEGORY_NAMES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-1.5"><Label>Sub-category</Label><Select value={f.sub} onValueChange={(v) => setF({ ...f, sub: v })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{subs.map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid gap-1.5"><Label>Nature</Label><Select value={f.nature} onValueChange={(v) => setF({ ...f, nature: v as typeof f.nature, exp: v === "Consumable" ? "OpEx" : "CapEx" })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Consumable">Consumable (tracked by quantity)</SelectItem><SelectItem value="Non-consumable asset">Asset (tagged individually)</SelectItem></SelectContent></Select></div>
              <div className="grid gap-1.5"><Label>Expenditure</Label><Select value={f.exp} onValueChange={(v) => setF({ ...f, exp: v as typeof f.exp })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="OpEx">OpEx (operating)</SelectItem><SelectItem value="CapEx">CapEx (capital)</SelectItem></SelectContent></Select></div>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-primary/40 bg-primary/5 py-5">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Code to be issued</span>
              <span className="font-mono text-2xl font-bold tracking-wide text-primary">{code}</span>
              <span className="text-xs text-muted-foreground">{CATEGORY_NAMES[f.cat]} · {subName} · next free serial</span>
            </div>
          </>}
          {step === 1 && <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="nm">Description</Label><Input id="nm" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
            <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="sp">Specification</Label><Textarea id="sp" value={f.spec} onChange={(e) => setF({ ...f, spec: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label htmlFor="uom">Unit of measure</Label><Input id="uom" value={f.uom} onChange={(e) => setF({ ...f, uom: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label htmlFor="ro">Re-order level</Label><Input id="ro" type="number" min={0} value={f.reorder} onChange={(e) => setF({ ...f, reorder: +e.target.value })} /></div>
            {asset ? <>
              <div className="grid gap-1.5"><Label htmlFor="wr">Warranty</Label><Input id="wr" placeholder="e.g. 2 years" value={f.warranty} onChange={(e) => setF({ ...f, warranty: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label htmlFor="ul">Useful life</Label><Input id="ul" placeholder="e.g. 5 years" value={f.usefulLife} onChange={(e) => setF({ ...f, usefulLife: e.target.value })} /></div>
              <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="dp">Depreciation rule</Label><Input id="dp" placeholder="e.g. Straight-line 20% a year" value={f.depreciation} onChange={(e) => setF({ ...f, depreciation: e.target.value })} /></div>
            </> : <div className="grid gap-1.5"><Label htmlFor="sl">Shelf life</Label><Input id="sl" value={f.shelfLife} onChange={(e) => setF({ ...f, shelfLife: e.target.value })} /></div>}
          </div>}
          {step === 2 && <>
            <div className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-mono text-lg font-bold text-primary">{code}</span><div className="flex gap-1"><Status tone="neutral" icon={null}>{asset ? "Asset" : "Consumable"}</Status><Status tone="neutral" icon={null}>{f.exp}</Status></div></div>
              <div className="mt-1 text-[15px] font-semibold">{f.name}</div>
              <div className="text-xs text-muted-foreground">{CATEGORY_NAMES[f.cat]} · {subName} · {f.uom} · re-order at {f.reorder}</div>
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold"><Sparkles className="size-4 text-gold-text" /> Duplicate check</div>
              {exact ? <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/8 p-3 text-xs"><AlertTriangle className="size-4 text-destructive" /><span><b>{exact.code}</b> already has this exact description. Use it instead of creating a new code.</span></div>
                : similar.length ? <ul className="grid gap-2">{similar.map(({ i, score }) => (
                  <li key={i.code} className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-xs">
                    <span className="min-w-0"><b className="font-mono">{i.code}</b> <span className="text-muted-foreground">{i.name}</span></span>
                    <Status tone="warning" icon={Copy}>{Math.round(score * 100)}% similar</Status>
                  </li>))}<li className="text-[11px] text-muted-foreground">Similar items exist. The Catalogue Officer will confirm the new item is genuinely different.</li></ul>
                  : <div className="flex gap-2 rounded-lg border border-success/30 bg-success/8 p-3 text-xs"><CheckCircle2 className="size-4 text-success" />No similar item in the catalogue.</div>}
            </div>
          </>}
        </motion.div>
        <DialogFooter className="gap-2">
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 2 ? <Button onClick={() => setStep(step + 1)} disabled={step === 1 && !f.name.trim()}>Continue <ArrowRight /></Button>
            : <Button onClick={submit} disabled={!!exact}><Package /> Send for approval</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const s = useApp();
  const [f, setF] = useState({ name: item?.name ?? "", spec: item?.spec ?? "", uom: item?.uom ?? "", reorderLevel: item?.reorderLevel ?? 0, shelfLife: item?.shelfLife ?? "" });
  if (!item) return null;
  const save = () => {
    const r = s.updateItem(item.code, f);
    if (!r.ok) { toast.error(r.title, { description: r.message }); return; }
    toast.success(r.title, { description: r.message });
    onClose();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit {item.code}</DialogTitle><DialogDescription>Category, nature and CapEx / OpEx are fixed by the code. Every change is recorded with its previous value.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="en">Description</Label><Input id="en" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="es">Specification</Label><Textarea id="es" value={f.spec} onChange={(e) => setF({ ...f, spec: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="eu">Unit of measure</Label><Input id="eu" value={f.uom} onChange={(e) => setF({ ...f, uom: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label htmlFor="er">Re-order level</Label><Input id="er" type="number" min={0} value={f.reorderLevel} onChange={(e) => setF({ ...f, reorderLevel: +e.target.value })} /></div>
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="el">Shelf life</Label><Input id="el" value={f.shelfLife} onChange={(e) => setF({ ...f, shelfLife: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save changes</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RetireDialog({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const s = useApp();
  const [reason, setReason] = useState("Superseded by an updated specification");
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Retire {item?.code}</DialogTitle><DialogDescription>A retired code can&apos;t be demanded or ordered. It is never reused, and its history stays on record. The Director approves the change.</DialogDescription></DialogHeader>
        {item && item.totalStock > 0 && <div className="flex gap-2 rounded-lg border border-warning/30 bg-warning/8 p-3 text-xs"><AlertTriangle className="size-4 shrink-0 text-warning" />{item.totalStock} {item.uom.toLowerCase()} are still in stores. The system will refuse until they are issued, transferred or disposed of.</div>}
        <div className="grid gap-1.5"><Label htmlFor="rr">Reason</Label><Textarea id="rr" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="destructive" onClick={() => { const r = s.requestDeactivation(item!.code, reason); toast[r.ok ? "success" : "error"](r.title, { description: r.message }); if (r.ok) onClose(); }}>Send for approval</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LegacyDialog({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const s = useApp();
  const [code, setCode] = useState("");
  return (
    <Dialog open={!!item} onOpenChange={(o) => { if (!o) { setCode(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Map an old code to {item?.code}</DialogTitle><DialogDescription>Records from the old system under this code will trace to the new Item Code. One old code can point to only one item.</DialogDescription></DialogHeader>
        {!!item?.legacyCodes?.length && <div className="flex flex-wrap gap-1.5">{item.legacyCodes.map((l) => <Status key={l} tone="neutral" icon={Link2}>{l}</Status>)}</div>}
        <div className="grid gap-1.5"><Label htmlFor="lc">Old code</Label><Input id="lc" placeholder="e.g. ST-BALL-117" value={code} onChange={(e) => setCode(e.target.value)} /></div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={() => { const r = s.mapLegacyCode(item!.code, code); toast[r.ok ? "success" : "error"](r.title, { description: r.message }); if (r.ok) setCode(""); }}>Map code</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
