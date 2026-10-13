"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowRight, Check, Clock, Gauge, Layers, Lock, Plus, ShieldCheck, Undo2, Unlock, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarList, Empty, KpiGrid, Meter, PageHeader, Section, Status } from "@/components/dash";
import { useApp, useRole } from "@/lib/store";
import { mil, pkr } from "@/lib/domain";
import type { Approval } from "@/lib/types";
import { cn } from "@/lib/utils";

type Filter = "pending" | "returned" | "done" | "all";

export default function ApprovalsPage() {
  return <Suspense><Approvals /></Suspense>;
}

function Approvals() {
  const params = useSearchParams();
  const router = useRouter();
  const s = useApp();
  const role = useRole();
  const [filter, setFilter] = useState<Filter>("pending");
  const selectedId = params.get("id") ?? s.approvals.find((a) => a.status === "pending")?.id ?? s.approvals[0].id;
  const selected = s.approvals.find((a) => a.id === selectedId) ?? s.approvals[0];
  const [matrixOpen, setMatrixOpen] = useState(false);
  const [grvOpen, setGrvOpen] = useState(false);
  const [decide, setDecide] = useState<string | null>(null);

  const pending = s.approvals.filter((a) => a.status === "pending");
  const mine = pending.filter((a) => a.chain.find((c) => c.status === "pending")?.roleKey === s.role);
  const breached = pending.filter((a) => a.elapsedHours > a.slaHours);
  const list = s.approvals.filter((a) => filter === "all" || (filter === "pending" && a.status === "pending") || (filter === "returned" && a.status === "returned") || (filter === "done" && (a.status === "approved" || a.status === "rejected")));
  const select = (id: string) => router.replace(`/approvals/?id=${id}`, { scroll: false });

  return (
    <>
      <PageHeader module="Procurement" title="Approvals & workflow" description="Approval matrix by value band, delegation, SLA escalation, Intention to Award and grievance redressal."
        actions={<Button variant="outline" onClick={() => setMatrixOpen(true)}><Layers /> Approval matrix</Button>} />

      <KpiGrid key={s.role} items={[
        { label: "Awaiting my decision", value: mine.length, icon: Clock, hero: true, foot: `${pending.length} pending across all approvers` },
        { label: "Past SLA and escalated", value: breached.length, icon: AlertTriangle, delta: breached.length ? { dir: "up", text: "Escalated to next authority", good: false } : { dir: "flat", text: "None" } },
        { label: "Approvals on time", value: s.analytics.slaOnTime[3], suffix: "%", icon: Gauge, delta: { dir: "up", text: "+3 pts vs Sep" }, spark: s.analytics.slaOnTime, sparkColor: "var(--chart-2)" },
        { label: "Value awaiting approval", prefix: "PKR", value: pending.reduce((a, x) => a + (x.amount ?? 0), 0) / 1e6, decimals: 1, suffix: "M", icon: Wallet, foot: "All pending requests" },
      ]} />

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <Section title="Approval inbox" description="Select a request to see its chain and act on it." flush className="self-start"
          action={<Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}><TabsList><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="returned">Returned</TabsTrigger><TabsTrigger value="done">Completed</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList></Tabs>}>
          <Table>
            <TableHeader><TableRow><TableHead className="pl-5">Request</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Stage</TableHead><TableHead className="w-32">SLA</TableHead><TableHead className="pr-5">Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {list.map((a) => {
                const step = a.chain.find((c) => c.status === "pending");
                const done = a.chain.filter((c) => c.status === "approved").length;
                const pct = (a.elapsedHours / a.slaHours) * 100;
                const late = a.status === "pending" && pct > 100;
                return (
                  <TableRow key={a.id} onClick={() => select(a.id)} data-state={a.id === selected.id ? "selected" : undefined} className={cn("cursor-pointer", a.id === selected.id && "shadow-[inset_3px_0_0_var(--primary)]")}>
                    <TableCell className="max-w-[18rem] pl-5 whitespace-normal">
                      <div className="text-[13px] font-semibold">{a.type} <span className="font-mono text-[11px] font-normal text-muted-foreground">{a.ref}</span></div>
                      <div className="line-clamp-1 text-xs text-muted-foreground">{a.title}</div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular">{a.amount ? mil(a.amount, 2) : "—"}</TableCell>
                    <TableCell><div className="text-xs">{step?.role ?? (a.status === "approved" ? "Complete" : "—")}</div><div className="text-[11px] text-muted-foreground">Step {Math.min(done + 1, a.chain.length)} of {a.chain.length}</div></TableCell>
                    <TableCell>{a.status === "pending" ? <><Meter value={pct} tone={late ? "danger" : pct > 80 ? "warning" : "primary"} /><div className="mt-1 text-[11px] text-muted-foreground tabular">{a.elapsedHours}h / {a.slaHours}h</div></> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="pr-5"><ApprovalStatus a={a} /></TableCell>
                  </TableRow>
                );
              })}
              {!list.length && <TableRow><TableCell colSpan={5}><Empty>No requests in this view.</Empty></TableCell></TableRow>}
            </TableBody>
          </Table>
        </Section>
        <ApprovalDetail key={selected.id + selected.status + selected.chain.map((c) => c.status).join()} a={selected} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Section title="Intention to Award & standstill" description="No purchase order can be released until the grievance window closes." className="self-start">
          <div className="flex flex-col gap-3">
            {s.intentions.map((t) => {
              const closed = t.elapsed >= t.days;
              const openGrv = s.grievances.filter((g) => g.tender === t.tender && !g.status.startsWith("Closed")).length;
              return (
                <div key={t.tender} className="rounded-lg border bg-muted/30 p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div><div className="text-[13px] font-semibold">{t.title}</div><div className="font-mono text-[11px] text-muted-foreground">{t.tender}</div></div>
                    <Status tone="gold">{t.bidder}</Status>
                  </div>
                  <Meter value={(t.elapsed / t.days) * 100} tone="gold" className="h-2" />
                  <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                    <span>Day {t.elapsed} of {t.days} · ends {t.expires}</span>
                    <span className={openGrv ? "font-semibold text-destructive" : ""}>{openGrv ? `${openGrv} open grievance` : "No grievances"}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    {closed && !openGrv ? <Status tone="success" icon={Unlock}>Window closed · PO can be released</Status> : <Status tone="warning" icon={Lock}>PO release locked</Status>}
                    {!closed && !role.readOnly && <Button size="sm" variant="ghost" onClick={() => s.closeStandstill(t.tender)}>Fast-forward to end of window</Button>}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Grievance register" description="Complaint intake, committee assignment, hearing and decision." flush className="self-start"
          action={!role.readOnly && <Button size="sm" variant="outline" onClick={() => setGrvOpen(true)}><Plus /> Log grievance</Button>}>
          <Table>
            <TableHeader><TableRow><TableHead className="pl-5">Grievance</TableHead><TableHead>Complainant</TableHead><TableHead>Status</TableHead><TableHead className="pr-5" /></TableRow></TableHeader>
            <TableBody>
              {s.grievances.map((g) => {
                const open = !g.status.startsWith("Closed");
                return (
                  <TableRow key={g.id}>
                    <TableCell className="max-w-[14rem] pl-5 whitespace-normal"><div className="font-mono text-xs font-semibold">{g.id}</div><div className="text-xs text-muted-foreground">{g.subject}</div></TableCell>
                    <TableCell className="max-w-[14rem] whitespace-normal"><div className="text-xs">{g.complainant}</div><div className="line-clamp-1 text-[11px] text-muted-foreground">{g.ground}</div></TableCell>
                    <TableCell>{open ? <Status tone="warning" icon={Clock}>{g.status}</Status> : <Status tone="neutral" icon={Check}>{g.status.replace("Closed: ", "")}</Status>}</TableCell>
                    <TableCell className="pr-5 text-right">{open && !role.readOnly && <Button size="sm" variant="outline" onClick={() => setDecide(g.id)}>Decide</Button>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Average approval time by document" description="Hours from submission to decision, FY to date. SLA is 48 hours." className="self-start">
          <BarList rows={s.analytics.approvalHoursByType.map((r: { name: string; value: number }) => ({ ...r, color: r.value > 48 ? "var(--chart-5)" : "var(--chart-1)" }))} format={(v) => `${v}h`} />
        </Section>
        <Section title="Delegation & escalation" description="Out-of-office delegation without sharing credentials." className="self-start">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
            <div><div className="text-[13px] font-semibold">{s.delegation.from} → {s.delegation.to}</div><div className="text-xs text-muted-foreground">{s.delegation.period} · {s.delegation.reason}</div></div>
            {s.delegation.active ? <div className="flex items-center gap-2"><Status tone="success">Active</Status>{!role.readOnly && <Button size="sm" variant="outline" onClick={s.endDelegation}>End</Button>}</div> : <Status tone="neutral">Ended</Status>}
          </div>
          <ol className="grid gap-3 text-[13px]">
            {[["Reminder at 80% of SLA", "Email and in-app to the current approver"], ["Escalation at 100%", "Routed to the next authority, original approver copied"], ["Daily breach summary", "Sent to Director Procurement and Internal Audit"]].map(([t, d], i) => (
              <li key={t} className="flex gap-3"><span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">{i + 1}</span><div><div className="font-medium">{t}</div><div className="text-xs text-muted-foreground">{d}</div></div></li>
            ))}
          </ol>
        </Section>
      </div>

      <Dialog open={matrixOpen} onOpenChange={setMatrixOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Approval matrix · delegation of financial powers</DialogTitle><DialogDescription>Held as configuration, not code. Thresholds are illustrative until PCB confirms its DFP in Phase 0.</DialogDescription></DialogHeader>
          <Table>
            <TableHeader><TableRow><TableHead>Band</TableHead><TableHead>Value range</TableHead><TableHead>Approval chain</TableHead></TableRow></TableHeader>
            <TableBody>{s.approvalMatrix.map((b) => (<TableRow key={b.band}><TableCell><Status tone="neutral" icon={null}>{b.band}</Status></TableCell><TableCell className="text-xs">{b.range}</TableCell><TableCell className="text-xs whitespace-normal">{b.chain.join(" → ")}</TableCell></TableRow>))}</TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <GrievanceDialog open={grvOpen} onOpenChange={setGrvOpen} />
      <DecisionDialog id={decide} onClose={() => setDecide(null)} />
    </>
  );
}

function ApprovalStatus({ a }: { a: Approval }) {
  if (a.status === "approved") return <Status tone="success">Approved</Status>;
  if (a.status === "rejected") return <Status tone="danger">Rejected</Status>;
  if (a.status === "returned") return <Status tone="warning" icon={Undo2}>Returned</Status>;
  if (a.elapsedHours > a.slaHours) return <Status tone="danger" icon={AlertTriangle}>Past SLA</Status>;
  return <Status tone="info">Pending</Status>;
}

function ApprovalDetail({ a }: { a: Approval }) {
  const s = useApp();
  const role = useRole();
  const [remark, setRemark] = useState("");
  const [err, setErr] = useState(false);
  const step = a.chain.find((c) => c.status === "pending");
  const sod = a.status === "pending" && a.requestedBy === role.user;
  const canAct = a.status === "pending" && !!step && !role.readOnly && !sod && step.roleKey === s.role;
  const pct = (a.elapsedHours / a.slaHours) * 100;
  const late = a.status === "pending" && pct > 100;
  const matrix = s.approvalMatrix.find((b) => b.band === a.band);

  const act = (action: "approve" | "reject" | "return", demo = false) => {
    if (action !== "approve" && !remark.trim()) { setErr(true); return; }
    const r = s.decideApproval(a.id, action, remark, demo);
    if (r.ok) toast.success(r.title, { description: r.message }); else toast.error(r.title, { description: r.message });
  };

  return (
    <Section className="self-start" title={a.title} description={`${a.ref} · ${a.dept} · raised by ${a.requestedBy} on ${a.submitted}`}
      action={<div className="flex flex-wrap gap-1.5"><Status tone="neutral" icon={null}>{a.type}</Status>{a.band !== "—" && <Status tone="neutral" icon={null}>Band {a.band}</Status>}</div>}>
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/40 px-4 py-3"><div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</div><div className="mt-1 font-mono text-lg font-semibold tabular">{a.amount ? pkr(a.amount) : "—"}</div></div>
          <div className="rounded-lg border bg-muted/40 px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">SLA</div>
            {a.status === "pending" ? <>
              <div className={cn("mt-1 font-mono text-lg font-semibold tabular", late && "text-destructive")}>{a.elapsedHours}h <span className="text-xs font-normal text-muted-foreground">of {a.slaHours}h</span></div>
              <Meter value={pct} tone={late ? "danger" : pct > 80 ? "warning" : "primary"} className="mt-1" />
              {late && <div className="mt-1 text-[11px] text-destructive">Escalated to next authority · reminder sent</div>}
            </> : <div className="mt-1 text-lg text-muted-foreground">—</div>}
          </div>
        </div>
        {matrix && <p className="text-xs text-muted-foreground">Routing from band {a.band} ({matrix.range}): {matrix.chain.join(" → ")}</p>}

        <ol className="relative grid gap-0">
          {a.chain.map((c, i) => (
            <li key={i} className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
              {i < a.chain.length - 1 && <span className={cn("absolute top-7 bottom-0 left-[13px] w-0.5", c.status === "approved" ? "bg-success/40" : "bg-border")} />}
              <span className={cn("flex size-7 items-center justify-center rounded-full border text-xs font-bold",
                c.status === "approved" && "border-success/40 bg-success/12 text-success",
                c.status === "pending" && "border-gold bg-gold/15 text-gold-text shadow-[0_0_0_4px] shadow-gold/12",
                (c.status === "rejected" || c.status === "returned") && "border-destructive/40 bg-destructive/10 text-destructive",
                c.status === "waiting" && "bg-muted text-muted-foreground")}>
                {c.status === "approved" ? <Check className="size-3.5" /> : c.status === "rejected" ? <X className="size-3.5" /> : c.status === "returned" ? <Undo2 className="size-3.5" /> : i + 1}
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold">{c.role} <span className="font-normal text-muted-foreground">· {c.name}</span></div>
                <div className="text-[11px] text-muted-foreground">{c.status === "approved" ? `Approved ${c.at}` : c.status === "pending" ? "Awaiting decision" : c.status === "waiting" ? "Not yet reached" : `${c.status === "rejected" ? "Rejected" : "Returned"} ${c.at}`}</div>
                {c.remark && <div className="mt-1.5 rounded-md border-l-2 bg-muted/50 px-2.5 py-1.5 text-xs">{c.remark}</div>}
              </div>
            </li>
          ))}
        </ol>

        {sod ? (
          <div className="rounded-lg border border-info/30 bg-info/8 p-3 text-xs">
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold"><ShieldCheck className="size-4 text-info" />Segregation of duties</div>
            You raised this request, so you can&apos;t approve it. It goes to the alternate approver.
            <div className="mt-2"><Button size="sm" variant="outline" onClick={() => { const r = s.rerouteApproval(a.id); toast.success(r.title, { description: r.message }); }}>Route to CFO</Button></div>
          </div>
        ) : canAct ? (
          <div className="grid gap-2">
            <Label htmlFor="remark">Remarks <span className="font-normal text-muted-foreground">(required to reject or return)</span></Label>
            <Textarea id="remark" value={remark} onChange={(e) => { setRemark(e.target.value); setErr(false); }} placeholder="Add your remarks for the record" />
            {err && <p className="text-xs text-destructive">Add a remark before rejecting or returning this request.</p>}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={() => act("approve")}><Check /> Approve</Button>
              <Button variant="outline" onClick={() => act("return")}><Undo2 /> Return for clarification</Button>
              <Button variant="destructive" onClick={() => act("reject")}><X /> Reject</Button>
            </div>
          </div>
        ) : a.status === "pending" && step ? (
          <div className="rounded-lg border border-warning/30 bg-warning/8 p-3 text-xs">
            <div className="mb-1 flex items-center gap-1.5 text-[13px] font-semibold"><Clock className="size-4 text-warning" />Waiting for {step.role}</div>
            {step.roleKey ? `Awaiting approval by ${s.roles[step.roleKey].label}.` : "This approver is outside the designated roles."}
            {!step.roleKey && !role.readOnly && <div className="mt-2"><Button size="sm" variant="outline" onClick={() => act("approve", true)}>Record {step.role} sign-off</Button></div>}
          </div>
        ) : (
          <div className={cn("rounded-lg border p-3 text-xs", a.status === "approved" ? "border-success/30 bg-success/8" : "border-warning/30 bg-warning/8")}>
            <span className="text-[13px] font-semibold">{a.status === "approved" ? "Fully approved" : a.status === "returned" ? `Returned to ${a.requestedBy}` : "Rejected"}</span>
          </div>
        )}
        {a.ref === "PCB/LOG-PSL10/2026/089" && <Button variant="ghost" size="sm" className="justify-self-start" asChild><Link href="/sourcing/">Open comparative statement <ArrowRight /></Link></Button>}
      </div>
    </Section>
  );
}

function GrievanceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useApp();
  const openWindows = s.intentions.filter((t) => t.elapsed < t.days);
  const [tender, setTender] = useState("");
  const [who, setWho] = useState("Musco Stadium Lighting International");
  const [ground, setGround] = useState("Warranty period was not given weight in the evaluation.");
  const t = openWindows.find((x) => x.tender === tender) ?? openWindows[0];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Log a grievance</DialogTitle><DialogDescription>Complaints are accepted only while a standstill window is open.</DialogDescription></DialogHeader>
        {t ? (
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>Tender</Label>
              <Select value={t.tender} onValueChange={setTender}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{openWindows.map((x) => <SelectItem key={x.tender} value={x.tender}>{x.tender} · {x.title}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="grid gap-1.5"><Label htmlFor="who">Complainant</Label><Input id="who" value={who} onChange={(e) => setWho(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label htmlFor="ground">Grounds</Label><Textarea id="ground" value={ground} onChange={(e) => setGround(e.target.value)} /></div>
          </div>
        ) : <Empty>No tender is in its standstill window.</Empty>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {t && <Button onClick={() => { const r = s.addGrievance({ tender: t.tender, subject: t.title, complainant: who, ground }); toast.success(r.title, { description: r.message }); onOpenChange(false); }}>Register grievance</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecisionDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const s = useApp();
  const g = s.grievances.find((x) => x.id === id);
  const [v, setV] = useState("Closed: complaint rejected");
  return (
    <Dialog open={!!g} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Decision on {g?.id}</DialogTitle><DialogDescription>{g?.complainant} · {g?.tender}</DialogDescription></DialogHeader>
        <p className="text-sm">{g?.ground}</p>
        <Select value={v} onValueChange={setV}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Closed: complaint rejected">Complaint rejected</SelectItem><SelectItem value="Closed: upheld, re-evaluate">Upheld, re-evaluate</SelectItem></SelectContent></Select>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={() => { if (g) s.decideGrievance(g.id, v); toast.success("Decision recorded"); onClose(); }}>Record decision</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
