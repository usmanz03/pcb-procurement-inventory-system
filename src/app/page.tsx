"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Clock, FileText, Gauge, Gavel, Layers, Lock, Package, ShieldCheck, Truck, Users, Wallet, ArrowRight, BarChart3, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarList, KpiGrid, Meter, PageHeader, Section, StackedBars, Status, type KpiProps } from "@/components/dash";
import { useApp, useRole } from "@/lib/store";
import { mil, parseD, pkr, TODAY } from "@/lib/domain";
import type { RoleKey } from "@/lib/types";

const SCOPE: Record<RoleKey, string> = {
  director: "Approves requests and releases purchase orders",
  committee: "Tender evaluation, bidding documents and grievances",
  cfo: "Budget, approvals above PKR 3M, three-way match and payments",
  storekeeper: "Stores, demands, custody and goods receipt",
  auditor: "Read-only access to every screen; every view is logged",
};

export default function Overview() {
  const router = useRouter();
  const s = useApp();
  const role = useRole();
  const A = s.analytics;

  const allocation = s.budgetHeads.reduce((a, b) => a + b.allocation, 0);
  const committed = s.budgetHeads.reduce((a, b) => a + b.committed, 0);
  const pct = (committed / allocation) * 100;
  const pending = s.approvals.filter((a) => a.status === "pending");
  const mine = pending.filter((a) => a.chain.find((c) => c.status === "pending")?.roleKey === s.role);
  const breached = pending.filter((a) => a.elapsedHours > a.slaHours);
  const lowStock = s.itemsMaster.filter((i) => i.totalStock <= i.reorderLevel);
  const stockValue = s.stadiumStores.reduce((a, x) => a + x.valuationPkr, 0);
  const acks = Object.values(s.custodyMeta).filter((m) => m.ack === "Pending");
  const exceptions = s.invoices.filter((i) => i.match === "Exception" && i.status !== "Credit note requested");
  const payables = s.invoices.filter((i) => i.status === "Approved for payment").reduce((a, i) => a + i.base * 1.18 - i.base * 0.045, 0);
  const openPOs = s.purchaseOrders.filter((p) => p.received < p.qty);
  const overdue = openPOs.filter((p) => parseD(p.due) < TODAY);
  const openGrv = s.grievances.filter((g) => !g.status.startsWith("Closed"));
  const headsHigh = s.budgetHeads.filter((b) => b.committed / b.allocation > 0.75);

  const kpis: Record<RoleKey, KpiProps[]> = {
    director: [
      { label: "Committed spend, FY to date", prefix: "PKR", value: committed / 1e6, decimals: 1, suffix: "M", icon: Wallet, hero: true, foot: `${pct.toFixed(0)}% of PKR ${mil(allocation, 0)} budget`, spark: [28, 61.3, 105.6, committed / 1e6], href: "/reports/?type=procurement" },
      { label: "Awaiting my approval", value: mine.length, icon: Clock, delta: breached.length ? { dir: "down", text: `${breached.length} past SLA`, good: false } : { dir: "flat", text: "All within SLA" }, foot: "Approval inbox", href: "/approvals/" },
      { label: "Demand-to-PO cycle time", value: A.cycleDays[3], suffix: " days", icon: Gauge, delta: { dir: "down", text: "5 days faster than Sep", good: true }, foot: `Target ${A.cycleTarget} days`, spark: A.cycleDays, sparkColor: "var(--chart-2)", href: "/reports/?type=procurement" },
      { label: "Active tenders & RFQs", value: A.activeTenders[3], icon: Gavel, foot: "2 in evaluation · 1 in standstill", spark: A.activeTenders, sparkColor: "var(--chart-4)", href: "/sourcing/" },
    ],
    cfo: [
      { label: "Budget committed", value: pct, decimals: 1, suffix: "%", icon: Wallet, hero: true, foot: `PKR ${mil(committed)} of ${mil(allocation, 0)}`, spark: [11.6, 25.4, 43.8, pct], href: "/reports/?type=procurement" },
      { label: "Payables cleared for release", prefix: "PKR", value: payables / 1e6, decimals: 2, suffix: "M", icon: CheckCircle2, foot: "Matched and approved invoices", href: "/finance/" },
      { label: "Three-way match exceptions", value: exceptions.length, icon: AlertTriangle, delta: exceptions.length ? { dir: "up", text: "Needs review", good: false } : { dir: "flat", text: "None" }, foot: "Outside tolerance", href: "/finance/" },
      { label: "Budget heads above 75%", value: headsHigh.length, icon: Layers, foot: headsHigh.map((h) => h.name.split(" ")[0]).join(", ") || "None" },
    ],
    storekeeper: [
      { label: "Stock value, all stores", prefix: "PKR", value: stockValue / 1e6, decimals: 1, suffix: "M", icon: Package, hero: true, foot: "5 stores · one ledger", spark: A.stockValue, href: "/inventory/" },
      { label: "At or below re-order level", value: lowStock.length, icon: AlertTriangle, delta: { dir: "flat", text: "Re-order alerts" }, foot: lowStock.map((i) => i.code.split("-")[2]).join(", "), href: "/inventory/" },
      { label: "POs awaiting receipt", value: openPOs.length, icon: Truck, delta: overdue.length ? { dir: "up", text: `${overdue.length} overdue`, good: false } : undefined, foot: "Goods receipt queue", href: "/orders/" },
      { label: "Custody confirmations pending", value: acks.length, icon: Users, foot: "Recipient has not confirmed", href: "/custody/" },
    ],
    committee: [
      { label: "Tenders in evaluation", value: 2, icon: Gavel, hero: true, foot: "089 floodlights · RFQ-0117", href: "/sourcing/" },
      { label: "Comparative statements to sign", value: pending.filter((a) => a.type === "Comparative Statement").length, icon: FileText, foot: "Committee sign-off", href: "/approvals/" },
      { label: "Open grievances", value: openGrv.length, icon: ShieldCheck, foot: "Redressal committee", href: "/approvals/" },
      { label: "Conflict-of-interest declarations", value: 100, suffix: "%", icon: CheckCircle2, foot: "All members declared", href: "/sourcing/" },
    ],
    auditor: [
      { label: "Actions on record", value: 1284 + s.recentActivities.length, icon: ShieldCheck, hero: true, foot: "Every action recorded, none can be altered", href: "/reports/?type=activity" },
      { label: "Self-approvals prevented", value: s.approvals.filter((a) => a.sodBlocked).length, icon: Lock, foot: "Segregation of duties", href: "/approvals/" },
      { label: "Approvals past SLA", value: breached.length, icon: Clock, foot: "Auto-escalated", href: "/approvals/" },
      { label: "Match exceptions", value: exceptions.length, icon: AlertTriangle, foot: "Invoice outside tolerance", href: "/finance/" },
    ],
  };

  type Work = { title: string; meta: string; status: React.ReactNode; href: string; sla?: number; late?: boolean };
  const work: Work[] = [];
  if (s.role === "director" || s.role === "cfo") {
    mine.forEach((a) => {
      const late = a.elapsedHours > a.slaHours;
      work.push({ title: `${a.type} · ${a.ref}`, meta: `${a.title}${a.amount ? ` · ${pkr(a.amount)}` : ""}`, status: late ? <Status tone="danger" icon={AlertTriangle}>Past SLA</Status> : <Status tone="warning" icon={Clock}>{a.slaHours - a.elapsedHours}h left</Status>, href: `/approvals/?id=${a.id}`, sla: (a.elapsedHours / a.slaHours) * 100, late });
    });
  }
  if (s.role === "cfo") {
    exceptions.forEach((i) => work.push({ title: `Match exception · ${i.inv}`, meta: i.vendor, status: <Status tone="danger">Exception</Status>, href: "/finance/" }));
    s.invoices.filter((i) => i.status === "Approved for payment").forEach((i) => work.push({ title: `Release payment · ${i.inv}`, meta: `${i.vendor} · ${pkr(i.base * 1.18 - i.base * 0.045)} net`, status: <Status tone="success">Ready</Status>, href: "/finance/" }));
  }
  if (s.role === "storekeeper") {
    openPOs.forEach((p) => work.push({ title: `Receive ${p.po}`, meta: `${p.item} · ${p.qty - p.received} outstanding · due ${p.due}`, status: parseD(p.due) < TODAY ? <Status tone="danger">Overdue</Status> : <Status tone="info" icon={Truck}>Due</Status>, href: `/orders/?po=${p.po}` }));
    lowStock.forEach((i) => work.push({ title: `Re-order ${i.code}`, meta: `${i.totalStock} on hand, re-order at ${i.reorderLevel}`, status: <Status tone="warning">Low stock</Status>, href: "/inventory/" }));
  }
  if (s.role === "committee") {
    work.push({ title: "Score quotations · RFQ-2026-0117", meta: "Pitch rollers and turf seed · closes 19-Oct", status: <Status tone="info">Open</Status>, href: "/sourcing/?view=rfq" });
    work.push({ title: "Review bidding document · SBD v4.2-PCB-089", meta: `${s.sbdComments.length} comments · lock final version`, status: <Status tone="neutral">Review</Status>, href: "/sourcing/?view=docs" });
    openGrv.forEach((g) => work.push({ title: `Grievance ${g.id}`, meta: `${g.subject} · ${g.status}`, status: <Status tone="warning" icon={Gavel}>Hearing</Status>, href: "/approvals/" }));
  }
  if (s.role === "auditor") {
    breached.forEach((a) => work.push({ title: `SLA breach · ${a.id}`, meta: `${a.type} · ${a.elapsedHours}h against ${a.slaHours}h`, status: <Status tone="danger">Escalated</Status>, href: `/approvals/?id=${a.id}` }));
    s.approvals.filter((a) => a.sodBlocked).forEach((a) => work.push({ title: `Self-approval blocked · ${a.ref}`, meta: a.requestedBy, status: <Status tone="info" icon={ShieldCheck}>SoD</Status>, href: `/approvals/?id=${a.id}` }));
  }

  const spend = A.months.map((m: string, i: number) => ({ month: m, capex: A.committedCapex[i], opex: A.committedOpex[i] }));
  const pipeColors = ["var(--chart-1)", "var(--chart-1)", "var(--chart-2)", "var(--chart-4)", "var(--chart-3)", "var(--chart-6)", "var(--chart-6)", "var(--chart-1)"];
  const pipeHref: Record<string, string> = { inventory: "/inventory/", tenders: "/sourcing/", approvals: "/approvals/", orders: "/orders/", finance: "/finance/" };

  return (
    <>
      <PageHeader
        module="Command centre"
        title="Procurement & stores at a glance"
        description="Commitments against budget, the demand-to-payment pipeline and what needs your decision, for your role."
        actions={<>
          <Button variant="outline" asChild><Link href="/reports/"><BarChart3 /> Reports</Link></Button>
          {!role.readOnly && <Button asChild><Link href="/inventory/?new=1"><Plus /> Raise demand</Link></Button>}
        </>}
      />

      <div className="card-lift mb-6 flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/12 text-sm font-bold text-primary ring-1 ring-primary/30">{role.initials}</span>
        <div className="min-w-[14rem] flex-1">
          <div className="text-sm font-semibold">Signed in as {role.user} · {role.label}</div>
          <div className="text-xs text-muted-foreground">{SCOPE[s.role]}. Nobody can approve their own request.</div>
        </div>
        <Badge variant="outline">FY 2026-27 · Q2</Badge>
        {role.readOnly && <Status tone="info" icon={Lock}>Read-only session</Status>}
      </div>

      <KpiGrid key={s.role} items={kpis[s.role]} />

      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Section title="Committed spend by month" description="PKR millions, FY 2026-27. Dashed line is the monthly plan." className="self-start">
          <StackedBars
            data={spend}
            xKey="month"
            config={{ capex: { label: "CapEx", color: "var(--chart-1)" }, opex: { label: "OpEx", color: "var(--chart-2)" } }}
            target={{ value: A.monthlyPlan, label: `Plan ${A.monthlyPlan}M` }}
            valueFormat={(v) => `PKR ${v.toFixed(1)}M`}
            height={290}
          />
        </Section>
        <Section title="Needs my action" description="Sorted by urgency." action={<Badge variant="secondary">{work.length} open</Badge>} className="self-start" contentClassName="px-2 pb-2">
          {work.length ? (
            <ul className="flex flex-col">
              {work.slice(0, 6).map((w, i) => (
                <motion.li key={w.title} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <button type="button" onClick={() => router.push(w.href)} className="group grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted/60">
                    <span className="truncate text-[13px] font-semibold group-hover:text-primary">{w.title}</span>
                    <span className="row-span-2 self-center">{w.status}</span>
                    <span className="truncate text-xs text-muted-foreground">{w.meta}</span>
                    {w.sla !== undefined && <Meter value={w.sla} tone={w.late ? "danger" : w.sla > 80 ? "warning" : "primary"} className="col-span-1 mt-1" />}
                  </button>
                </motion.li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground"><CheckCircle2 className="size-5 text-success" />Nothing waiting for you.</div>
          )}
        </Section>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Section title="Demand-to-payment pipeline" description="Documents at each stage, FY to date. Select a stage to open it." className="self-start">
          <div className="flex flex-col gap-2">
            {A.pipeline.map((p: { stage: string; n: number; tab: string }, i: number) => (
              <button key={p.stage} type="button" onClick={() => router.push(pipeHref[p.tab] ?? "/")} className="group grid grid-cols-[9.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-left text-[13px]">
                <span className="truncate text-muted-foreground group-hover:text-foreground">{p.stage}</span>
                <span className="h-7 overflow-hidden rounded-md bg-muted/60">
                  <motion.span
                    className="flex h-full items-center rounded-md pl-2.5 text-[11px] font-semibold text-white"
                    style={{ background: `linear-gradient(90deg, ${pipeColors[i]}, color-mix(in oklab, ${pipeColors[i]} 70%, transparent))` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(9, (p.n / A.pipeline[0].n) * 100)}%` }}
                    transition={{ duration: 0.9, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {Math.round((p.n / A.pipeline[0].n) * 100)}%
                  </motion.span>
                </span>
                <span className="text-right font-mono font-semibold tabular">{p.n}</span>
              </button>
            ))}
          </div>
        </Section>
        <Section title="Budget utilisation by head" description="Light bar is committed, solid bar is spent. Heads above 75% are flagged." className="self-start">
          <div className="flex flex-col gap-4">
            {s.budgetHeads.map((b, i) => {
              const c = (b.committed / b.allocation) * 100, sp = (b.spent / b.allocation) * 100, high = c > 75;
              return (
                <div key={b.id} className="grid gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="truncate font-medium">{b.name}</span>
                    <span className="font-mono text-xs tabular text-muted-foreground">{mil(b.committed)} / {mil(b.allocation, 0)}</span>
                  </div>
                  <div className="relative h-2.5 overflow-hidden rounded-full bg-muted">
                    <motion.div className={`absolute inset-y-0 left-0 rounded-full ${high ? "bg-warning/35" : "bg-primary/30"}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, c)}%` }} transition={{ duration: 0.9, delay: i * 0.06 }} />
                    <motion.div className={`absolute inset-y-0 left-0 rounded-full ${high ? "bg-warning" : "bg-primary"}`} initial={{ width: 0 }} animate={{ width: `${sp}%` }} transition={{ duration: 0.9, delay: i * 0.06 + 0.1 }} />
                  </div>
                  <div className="text-xs text-muted-foreground">{b.type} · {c.toFixed(0)}% committed · {sp.toFixed(0)}% spent {high && <span className="font-semibold text-warning">· above 75%</span>}</div>
                </div>
              );
            })}
          </div>
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Section title="Store valuation" description="Select a store to open its stock." className="self-start">
          <BarList rows={s.stadiumStores.map((x) => ({ name: x.name.replace(" Central Store", "").replace(" Stadium", ""), value: x.valuationPkr / 1e6 }))} format={(v) => `${v.toFixed(1)}M`} onSelect={(i) => router.push(`/inventory/?store=${s.stadiumStores[i].id}`)} />
        </Section>
        <Section title="Audit feed" description="Every create, approve, issue and receipt, with user and time." action={<Button variant="ghost" size="sm" asChild><Link href="/reports/?type=activity">All <ArrowRight /></Link></Button>} className="self-start" contentClassName="px-5 pb-4">
          <ul className="flex flex-col divide-y">
            {s.recentActivities.slice(0, 5).map((a) => (
              <li key={a.id} className="flex gap-3 py-2.5 first:pt-0">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[13px] font-medium">{a.title}</span><span className="shrink-0 text-[11px] text-muted-foreground">{a.time}</span></div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{a.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  );
}
