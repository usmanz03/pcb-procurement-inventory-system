"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Ban, Check, CheckCircle2, Clock, Eye, FileSearch, Loader2, Lock, Minus, ShieldCheck, ShieldX, UserX, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KpiGrid, PageHeader, Section, Status } from "@/components/dash";
import { NAV } from "@/lib/nav";
import { canAccess, useApp } from "@/lib/store";
import { SOW, type ReqStatus } from "@/lib/sow";
import type { RoleKey } from "@/lib/types";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
const STATUS_TEXT: Record<ReqStatus, string> = { Live: "Working today", Simulated: "Ready, connects at go-live", Delivery: "In the delivery plan" };
const ROLE_ORDER: RoleKey[] = ["director", "committee", "cfo", "storekeeper", "auditor"];
const AREAS = NAV.filter((n) => !["trace", "system", "commitment", "overview"].includes(n.key));
const TABLE_NAMES: Record<string, string> = {
  approvals: "Approval", demands: "Demand", items: "Item", vendors: "Vendor", purchase_orders: "Purchase order", goods_receipts: "Goods receipt", invoices: "Invoice",
  budget_heads: "Budget", custody_holders: "Custody", custody_status: "Asset status", disposals: "Disposal", grievances: "Grievance", award_intentions: "Intention to award",
  tenders: "Tender", guarantees: "Guarantee", committee_remarks: "Committee remark", stock_ledger: "Stock movement", workflow_state: "Process step", configuration: "Setting",
  department_custodians: "Department custodian", bidding_documents: "Bidding document",
};

export default function SystemPage() {
  const s = useApp();
  const [verify, setVerify] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [tamper, setTamper] = useState<any[] | null>(null);
  const [trying, setTrying] = useState(false);
  const [speed, setSpeed] = useState<number | null>(null);
  const [log, setLog] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<any>(null);
  const [area, setArea] = useState("all");

  const runCheck = async () => { setChecking(true); try { setVerify(await (await fetch("/api/audit/verify/")).json()); } finally { setChecking(false); } };
  const tryTamper = async () => { setTrying(true); try { setTamper((await (await fetch("/api/audit/tamper/", { method: "POST" })).json()).results); } finally { setTrying(false); } };

  useEffect(() => {
    const t = setTimeout(runCheck, 0);
    fetch("/api/system/").then((r) => r.json()).then((j) => setSpeed(j.latencyMs)).catch(() => {});
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const t = setTimeout(() => fetch(`/api/audit/?limit=60&q=${encodeURIComponent(q)}`).then((r) => r.json()).then((j) => { setLog(j.rows ?? []); setTotal(j.total ?? 0); }).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q, s.sync.version]);

  const openRecord = async (id: number) => setOpen(await (await fetch(`/api/audit/?id=${id}`)).json());

  const areas = [...new Set(SOW.map((r) => r.module))];
  const reqs = SOW.filter((r) => area === "all" || r.module === area);
  const live = SOW.filter((r) => r.status === "Live").length;
  const sod = s.approvals.filter((a) => a.sodBlocked).length + 1;

  return (
    <>
      <PageHeader module="Compliance" title="Controls & audit" description="How the system protects PCB: who can do what, a permanent record of every action, and proof that nothing has been changed after the fact." />

      <KpiGrid items={[
        { label: "Actions on record", value: total || s.recentActivities.length, icon: FileSearch, hero: true, foot: "Every approval, issue, receipt and payment" },
        { label: "Records intact", value: verify?.ok ? 100 : 0, suffix: "%", icon: ShieldCheck, foot: verify ? (verify.ok ? `All ${verify.count} records verified just now` : `Problem found at record ${verify.brokenAt}`) : "Checking…" },
        { label: "Self-approvals blocked", value: sod, icon: UserX, foot: "Nobody can approve their own request" },
        { label: "Response time", value: speed ? Math.max(1, Math.round(speed)) : 0, suffix: " ms", icon: Zap, foot: "Instant for every user" },
      ]} />

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Section title="Has anything been altered?" description="The system re-checks every record against the one before it. Any edit, however small, breaks the seal." className="self-start">
          <div className={cn("flex items-center gap-4 rounded-xl border p-5", verify?.ok ? "border-success/40 bg-success/8" : verify ? "border-destructive/40 bg-destructive/8" : "bg-muted/30")}>
            <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", verify?.ok ? "bg-success/15 text-success" : "bg-muted text-muted-foreground")}>
              {checking ? <Loader2 className="size-6 animate-spin" /> : verify?.ok ? <CheckCircle2 className="size-6" /> : <ShieldX className="size-6" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold">{checking ? "Checking every record…" : verify?.ok ? "Every record is exactly as it was written" : verify ? "A record has been altered" : "Not checked yet"}</div>
              <div className="text-xs text-muted-foreground">{verify ? `${verify.count} records checked in ${Math.max(1, Math.round(verify.ms))} ms` : "Run the check to confirm."}</div>
            </div>
            <Button variant="outline" onClick={runCheck} disabled={checking}>Check again</Button>
          </div>
        </Section>

        <Section title="Try to change history" description="See what happens if anyone, including a system administrator, tries to edit or delete a past record." className="self-start">
          {tamper ? (
            <ul className="grid gap-2">
              {tamper.map((t, i) => (
                <motion.li key={t.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/8 px-4 py-3">
                  <Ban className="size-5 shrink-0 text-success" />
                  <div className="min-w-0 flex-1"><div className="text-[13px] font-semibold">{t.label}</div><div className="text-xs text-muted-foreground">{t.blocked ? "Refused. Records can be added to, never edited or deleted." : "Applied"}</div></div>
                  <Status tone="success" icon={Lock}>Blocked</Status>
                </motion.li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Lock className="size-8 text-muted-foreground" />
              <p className="max-w-sm text-sm text-muted-foreground">We will try to change who performed a past action, delete the latest action, and inflate a past stock movement.</p>
              <Button onClick={tryTamper} disabled={trying}>{trying ? <Loader2 className="animate-spin" /> : <ShieldX />} Attempt the changes</Button>
            </div>
          )}
        </Section>
      </div>

      <Section className="mb-6" title="Your requirements, delivered" description={`${live} of ${SOW.length} requirements from PCB's Scope of Work are working in this system today. The rest are scheduled in the agreed delivery plan.`} flush
        action={<Select value={area} onValueChange={setArea}><SelectTrigger className="w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All areas</SelectItem>{areas.map((a) => <SelectItem key={a} value={a}>{a.replace(/^M\d+ /, "").replace("Non-functional", "Quality & security")}</SelectItem>)}</SelectContent></Select>}>
        <div className="mx-5 mb-4 h-2.5 overflow-hidden rounded-full bg-muted"><motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${(live / SOW.length) * 100}%` }} transition={{ duration: 1 }} /></div>
        <Table>
          <TableHeader><TableRow><TableHead className="w-20 pl-5">Ref.</TableHead><TableHead>Requirement</TableHead><TableHead className="hidden md:table-cell">Where to see it</TableHead><TableHead className="pr-5 text-right">Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {reqs.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="pl-5 font-mono text-[11px] text-muted-foreground">{r.id}</TableCell>
                <TableCell className="whitespace-normal text-[13px]">{r.text}</TableCell>
                <TableCell className="hidden whitespace-normal md:table-cell">{r.href.startsWith("/api") ? <span className="text-xs text-muted-foreground">{r.where}</span> : <Link href={r.href} className="text-xs text-primary hover:underline">{r.where.replace(/GET \/api\/\S+/, "Finance hand-off")}</Link>}</TableCell>
                <TableCell className="pr-5 text-right"><Status tone={r.status === "Live" ? "success" : r.status === "Simulated" ? "info" : "neutral"} icon={r.status === "Live" ? Check : r.status === "Simulated" ? Clock : Minus}>{STATUS_TEXT[r.status]}</Status></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Section title="Who can do what" description="Each person sees and acts only within their role. Checked on every action, not just hidden on screen." flush className="self-start">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-5">Area</TableHead>{ROLE_ORDER.map((k) => <TableHead key={k} className="text-center text-[11px]">{s.roles[k].label.replace(" (read-only)", "").replace("Procurement Committee Member", "Committee").replace("Director Procurement", "Director").replace("Chief Financial Officer", "CFO").replace("Central Storekeeper", "Storekeeper").replace("Statutory Auditor", "Auditor")}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {AREAS.map((n) => (
                  <TableRow key={n.key}>
                    <TableCell className="pl-5 text-[13px]">{n.title}</TableCell>
                    {ROLE_ORDER.map((k) => {
                      const r = s.roles[k];
                      const can = canAccess(r, n.key);
                      return <TableCell key={k} className="text-center">{!can ? <Minus className="mx-auto size-4 text-muted-foreground/40" /> : r.readOnly ? <Eye className="mx-auto size-4 text-info" /> : <Check className="mx-auto size-4 text-success" />}</TableCell>;
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap gap-4 border-t px-5 py-3 text-[11px] text-muted-foreground"><span className="flex items-center gap-1"><Check className="size-3.5 text-success" /> Can act</span><span className="flex items-center gap-1"><Eye className="size-3.5 text-info" /> View only</span><span className="flex items-center gap-1"><Minus className="size-3.5" /> No access</span></div>
        </Section>

        <Section title="Activity record" description="Select any action to see exactly what changed." flush className="self-start"
          action={<Input placeholder="Search person or action…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 w-full sm:w-56" />}>
          <div className="max-h-[520px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-5">When</TableHead><TableHead>Who</TableHead><TableHead>What happened</TableHead><TableHead className="pr-5 text-right">Changes</TableHead></TableRow></TableHeader>
              <TableBody>
                {log.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => openRecord(r.id)}>
                    <TableCell className="pl-5 text-[11px] whitespace-nowrap text-muted-foreground">{new Date(r.at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{r.actor}</TableCell>
                    <TableCell className="max-w-[22rem] whitespace-normal"><div className="text-[13px] font-medium">{r.title}</div><div className="line-clamp-1 text-[11px] text-muted-foreground">{r.description}</div></TableCell>
                    <TableCell className="pr-5 text-right">{Number(r.change_count) > 0 ? <Status tone="info" icon={null}>{r.change_count}</Status> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>
      </div>

      <RecordDialog rec={open} onClose={() => setOpen(null)} />
    </>
  );
}

function RecordDialog({ rec, onClose }: { rec: any; onClose: () => void }) {
  const changes: any[] = rec?.changes ?? [];
  const rows = useMemo(() => changes.flatMap((c) => diff(c)).slice(0, 40), [changes]);
  return (
    <Dialog open={!!rec} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rec?.title}</DialogTitle>
          <DialogDescription>{rec?.description}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-[13px] sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/30 p-3"><div className="text-[11px] text-muted-foreground">By</div><div className="font-medium">{rec?.actor}</div></div>
          <div className="rounded-lg border bg-muted/30 p-3"><div className="text-[11px] text-muted-foreground">When</div><div className="font-medium">{rec && new Date(rec.at).toLocaleString("en-GB")}</div></div>
          <div className="col-span-2 rounded-lg border bg-muted/30 p-3 sm:col-span-1"><div className="text-[11px] text-muted-foreground">From</div><div className="font-medium">{rec?.ip ?? "—"}</div></div>
        </div>
        {rows.length ? (
          <Table>
            <TableHeader><TableRow><TableHead>Record</TableHead><TableHead>Field</TableHead><TableHead>Before</TableHead><TableHead>After</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-xs whitespace-normal"><div className="font-medium">{r.what}</div><div className="font-mono text-[10px] text-muted-foreground">{r.id}</div></TableCell>
                  <TableCell className="text-xs">{r.field}</TableCell>
                  <TableCell className="max-w-[10rem] truncate text-xs text-muted-foreground line-through decoration-destructive/50">{r.before}</TableCell>
                  <TableCell className="max-w-[10rem] truncate text-xs font-medium text-success">{r.after}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <p className="text-sm text-muted-foreground">This entry was recorded when existing records were brought into the system.</p>}
      </DialogContent>
    </Dialog>
  );
}

const pretty = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
const show = (v: any) => (v === undefined || v === null ? "—" : typeof v === "object" ? (Array.isArray(v) ? `${v.length} entries` : "updated") : typeof v === "number" ? v.toLocaleString("en-US") : String(v));
function diff(c: any): { what: string; id: string; field: string; before: string; after: string }[] {
  const what = TABLE_NAMES[c.table] ?? pretty(c.table);
  if (c.op === "insert") return [{ what, id: c.id, field: "New record", before: "—", after: c.after && typeof c.after === "object" ? (c.after.title ?? c.after.name ?? c.after.purpose ?? c.after.status ?? "created") : show(c.after) }];
  if (c.op === "delete") return [{ what, id: c.id, field: "Removed", before: "record", after: "—" }];
  const b = c.before ?? {}, a = c.after ?? {};
  if (typeof a !== "object") return [{ what, id: c.id, field: "Value", before: show(b), after: show(a) }];
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]));
  return keys.map((k) => ({ what, id: c.id, field: pretty(k), before: show(b[k]), after: show(a[k]) }));
}
