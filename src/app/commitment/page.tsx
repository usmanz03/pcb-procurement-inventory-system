"use client";

/* eslint-disable @next/next/no-img-element */
import { motion } from "motion/react";
import { BadgeCheck, CalendarCheck, Check, Clock, FileKey2, GraduationCap, HandCoins, Headphones, MapPin, Settings2, ShieldCheck, Sparkles, Trophy, Wallet, X, type LucideIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CountUp, Section, Status } from "@/components/dash";
import { asset } from "@/lib/nav";
import { cn } from "@/lib/utils";

const HEADLINE = [
  { value: 2.5, decimals: 1, suffix: " months", label: "From signing to go-live", icon: CalendarCheck },
  { value: 3.4, decimals: 1, prefix: "PKR ", suffix: "M", label: "Fixed price, no escalation", icon: Wallet },
  { value: 90, suffix: " days", label: "Free warranty after go-live", icon: ShieldCheck },
  { value: 1, suffix: " hour", label: "Response to critical issues, 24×7", icon: Headphones },
];

const PHASES = [
  { n: "0", t: "Foundation", d: "4 days", what: "PCB's approval limits, PPRA rules and item coding agreed and set up", pay: "20%" },
  { n: "1", t: "Stores, demand & custody", d: "3 weeks", what: "Item catalogue, demands, all stores, custody down to each employee", pay: "25%" },
  { n: "2", t: "Vendors, tenders & approvals", d: "3½ weeks", what: "Vendor register, PPRA tendering, bid evaluation, approvals, grievances", pay: "25%" },
  { n: "3", t: "Orders, receipts & finance", d: "2 weeks", what: "Purchase orders, goods receipt, three-way match, payments, reports", pay: "15%" },
  { n: "4", t: "Go-live", d: "1½ weeks", what: "Your existing records moved in and reconciled, every user trained, live", pay: "10% + 5% after warranty" },
];

const PROMISES: { icon: LucideIcon; t: string; d: string }[] = [
  { icon: HandCoins, t: "Pay only on sign-off", d: "Every payment follows PCB's written approval of a finished phase. 5% is held back until the warranty period closes." },
  { icon: FileKey2, t: "PCB owns everything", d: "All software, records and documentation are handed over at go-live. No licences, no lock-in, no per-user fees." },
  { icon: Settings2, t: "Your rules, changed by you", d: "Approval limits, PPRA thresholds, tax rates and notifications are settings. Changing them needs no new software." },
  { icon: GraduationCap, t: "Every user trained", d: "Hands-on training for storekeepers, custodians, committee members, approvers and finance, plus training for PCB's own trainers." },
  { icon: BadgeCheck, t: "Tested against your requirements", d: "Every requirement in PCB's Scope of Work is checked with PCB's own testers and signed off before go-live." },
  { icon: MapPin, t: "Local team, your hours", d: "Support from Pakistan during PCB working hours, with round-the-clock cover whenever purchasing or receiving stops." },
];

const SUPPORT = [
  { sev: "Critical", when: "Purchasing, approvals or receiving stopped", resp: "1 hour, any time", fix: "4 hours", tone: "danger" as const },
  { sev: "High", when: "A key function slowed, workaround available", resp: "2 working hours", fix: "12 working hours", tone: "warning" as const },
  { sev: "Medium", when: "Report layout or minor fault", resp: "4 working hours", fix: "3 working days", tone: "info" as const },
  { sev: "Low", when: "Questions and small adjustments", resp: "1 working day", fix: "Next update", tone: "neutral" as const },
];

const COMPARE = [
  ["Time to go live", "12 to 18 months", "2.5 months"],
  ["Licence fees", "Annual, per user, often in US dollars", "None. Fixed price in rupees"],
  ["PPRA rules", "Added as a costly customisation", "Built in from day one"],
  ["Who owns the system", "The vendor", "PCB"],
  ["Support", "Overseas, across time zones", "Local, PCB hours, 24×7 for critical issues"],
  ["Changing approval limits", "Change request and consultants", "A setting PCB changes itself"],
];

export default function CommitmentPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative mb-8 overflow-hidden rounded-2xl border border-gold/40 bg-[radial-gradient(90%_120%_at_0%_0%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_60%),radial-gradient(70%_100%_at_100%_100%,color-mix(in_oklab,var(--gold)_20%,transparent),transparent_65%)] px-6 py-10 text-center md:px-12 md:py-14">
        <div className="mx-auto mb-5 flex items-center justify-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-2xl bg-white p-2 shadow-lg"><img src={asset("/pcb-logo.svg")} alt="Pakistan Cricket Board" className="h-full w-auto" /></span>
          <Sparkles className="size-5 text-gold" />
          <span className="flex h-16 items-center rounded-2xl border bg-card px-5 text-lg font-bold tracking-wide">TECHPRYSM</span>
        </div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-text">Our commitment to the Pakistan Cricket Board</p>
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight text-balance md:text-5xl">Built for PCB. Live in two and a half months. Owned by PCB for good.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground text-pretty">What you have seen today is not a mock-up. It is the working system, and every promise below is written into the contract.</p>
      </motion.div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {HEADLINE.map((h, i) => (
          <motion.div key={h.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
            className="card-lift flex flex-col items-center gap-2 rounded-2xl border bg-card px-5 py-6 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-gold/15 text-gold-text"><h.icon className="size-5" /></span>
            <div className="font-display text-4xl font-semibold tracking-tight"><CountUp value={h.value} decimals={h.decimals} prefix={h.prefix} suffix={h.suffix} /></div>
            <div className="text-sm text-muted-foreground">{h.label}</div>
          </motion.div>
        ))}
      </div>

      <Section className="mb-8" title="How we deliver" description="Five phases. Each one ends with PCB's sign-off, and only then is it invoiced.">
        <ol className="grid gap-4 md:grid-cols-5">
          {PHASES.map((p, i) => (
            <motion.li key={p.n} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }} className="relative flex flex-col rounded-xl border bg-muted/30 p-4">
              {i < PHASES.length - 1 && <span className="absolute top-8 -right-3 hidden h-0.5 w-2 bg-gold/60 md:block" />}
              <div className="mb-3 flex items-center justify-between">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{p.n}</span>
                <Status tone="neutral" icon={Clock}>{p.d}</Status>
              </div>
              <div className="text-sm font-semibold">{p.t}</div>
              <p className="mt-1 flex-1 text-xs text-muted-foreground">{p.what}</p>
              <div className="mt-3 border-t pt-2 text-[11px] text-muted-foreground">Payment on sign-off: <b className="text-foreground">{p.pay}</b></div>
            </motion.li>
          ))}
        </ol>
      </Section>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PROMISES.map((p, i) => (
          <motion.div key={p.t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05 }} className="card-lift rounded-2xl border bg-card p-5">
            <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary"><p.icon className="size-5" /></span>
            <div className="text-[15px] font-semibold">{p.t}</div>
            <p className="mt-1 text-sm text-muted-foreground">{p.d}</p>
          </motion.div>
        ))}
      </div>

      <Section className="mb-8" title="Why not an international ERP suite?" description="An indicative comparison with a typical large enterprise package." flush>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead className="pl-5"></TableHead><TableHead>Typical international suite</TableHead><TableHead className="pr-5"><span className="inline-flex items-center gap-1.5 text-gold-text"><Trophy className="size-4" /> Techprysm for PCB</span></TableHead></TableRow></TableHeader>
            <TableBody>
              {COMPARE.map(([k, a, b]) => (
                <TableRow key={k}>
                  <TableCell className="pl-5 text-[13px] font-medium">{k}</TableCell>
                  <TableCell className="text-[13px] whitespace-normal text-muted-foreground"><span className="inline-flex items-start gap-2"><X className="mt-0.5 size-4 shrink-0 text-destructive/70" />{a}</span></TableCell>
                  <TableCell className={cn("pr-5 text-[13px] whitespace-normal font-medium")}><span className="inline-flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{b}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Section>

      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Section title="Support you can count on" description="After the free 90-day warranty, under the annual support agreement." flush className="self-start">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="pl-5">Issue</TableHead><TableHead>We respond in</TableHead><TableHead className="pr-5">Fixed within</TableHead></TableRow></TableHeader>
              <TableBody>
                {SUPPORT.map((r) => (
                  <TableRow key={r.sev}>
                    <TableCell className="pl-5 whitespace-normal"><Status tone={r.tone} icon={null}>{r.sev}</Status><div className="mt-1 text-xs text-muted-foreground">{r.when}</div></TableCell>
                    <TableCell className="text-[13px] font-medium">{r.resp}</TableCell>
                    <TableCell className="pr-5 text-[13px]">{r.fix}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Section>
        <Section title="Annual support" description="Starts only after the free warranty ends." className="self-start">
          <div className="text-center">
            <div className="font-display text-4xl font-semibold">PKR 600,000</div>
            <div className="text-sm text-muted-foreground">per year, or PKR 150,000 per quarter</div>
          </div>
          <ul className="mt-5 grid gap-2 text-[13px]">
            {["Fixes and security updates", "Changes to approval limits, rules and reports", "16 hours a month of small improvements", "Monthly service report", "A refresher training session every year"].map((x) => (
              <li key={x} className="flex items-start gap-2"><Check className="mt-0.5 size-4 shrink-0 text-success" />{x}</li>
            ))}
          </ul>
        </Section>
      </div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mb-4 rounded-2xl border border-gold/40 bg-gold/8 px-6 py-8 text-center">
        <Trophy className="mx-auto mb-3 size-8 text-gold" />
        <div className="text-xl font-semibold">Ready to begin within four days of signing.</div>
        <p className="mx-auto mt-1 max-w-xl text-sm text-muted-foreground">Phase 0 starts with a workshop at Gaddafi Stadium to confirm PCB&apos;s approval limits and PPRA rules.</p>
      </motion.div>
    </div>
  );
}
