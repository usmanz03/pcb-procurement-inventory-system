"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import { Check, ChevronsUpDown, Eye, EyeOff, Loader2, LogIn, UserPlus, Users } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { asset } from "@/lib/nav";
import { DEMO_PASSWORD, SEEDED, useApp } from "@/lib/store";
import type { RoleKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const SCOPE: Record<RoleKey, string> = {
  director: "Approves requests, releases purchase orders, sees everything",
  committee: "Evaluates bids, comments on bidding documents, grievances",
  cfo: "Budget, approvals above PKR 3M, three-way match, payments",
  storekeeper: "Stores, demands, custody, goods receipt",
  auditor: "Can view every record, cannot change anything",
};

export function SignIn() {
  return (
    <div className="grid min-h-svh bg-background lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden border-r bg-[radial-gradient(120%_80%_at_0%_0%,color-mix(in_oklab,var(--primary)_28%,transparent),transparent_60%),radial-gradient(90%_70%_at_100%_100%,color-mix(in_oklab,var(--gold)_22%,transparent),transparent_60%)] p-12 lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-white p-1.5 shadow"><img src={asset("/pcb-logo.svg")} alt="" className="h-full w-auto" /></span>
          <div><div className="font-semibold">Pakistan Cricket Board</div><div className="text-xs text-muted-foreground">Procurement Wing · Gaddafi Stadium, Lahore</div></div>
        </div>
        <div className="my-auto max-w-xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-text">PPRA Rules 2004 · FY 2026-27</p>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight">Procurement, stores and custody on one system of record.</h1>
          <p className="mt-4 text-lg text-muted-foreground">From the first demand to final disposal, every item, approval and payment in one place.</p>
        </div>
        <p className="text-xs text-muted-foreground">Techprysm · Enterprise Software Solutions & System Integration</p>
      </div>
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white p-1.5"><img src={asset("/pcb-logo.svg")} alt="Pakistan Cricket Board" className="h-full w-auto" /></span>
            <div className="font-semibold">Procurement & Stores</div>
          </div>
          <AuthForms />
        </div>
      </div>
    </div>
  );
}

export function LiveIndicator() {
  const sync = useApp((s) => s.sync);
  const tone = sync.status === "live" ? "bg-success" : sync.status === "saving" ? "bg-warning" : sync.status === "offline" ? "bg-destructive" : "bg-muted-foreground";
  const label = sync.status === "live" ? "All changes saved" : sync.status === "saving" ? "Saving…" : sync.status === "offline" ? "Offline" : "Live";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href="/system/" className="hidden items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground md:inline-flex">
          <span className="relative flex size-2">
            {sync.status === "live" && <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", tone)} />}
            <span className={cn("relative inline-flex size-2 rounded-full", tone)} />
          </span>
          {label}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        Shared live with every signed-in user{sync.lastSync ? ` · updated ${new Date(sync.lastSync).toLocaleTimeString()}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

function AuthForms() {
  const [tab, setTab] = useState<"in" | "up">("in");
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">{tab === "in" ? "Welcome back" : "Create your account"}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{tab === "in" ? "Sign in with your PCB email address." : "Each person sees only what their role allows."}</p>
      <Tabs value={tab} onValueChange={(v) => setTab(v as "in" | "up")} className="mt-6">
        <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="in">Sign in</TabsTrigger><TabsTrigger value="up">Create account</TabsTrigger></TabsList>
      </Tabs>
      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="mt-5">
        {tab === "in" ? <SignInForm /> : <SignUpForm />}
      </motion.div>
    </div>
  );
}

function SignInForm() {
  const signIn = useApp((s) => s.signIn);
  const [who, setWho] = useState<string>("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const pick = (k: string) => { setWho(k); const u = SEEDED.find((x) => x.role === k)!; setEmail(u.email); setPw(DEMO_PASSWORD); setErr(""); };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = await signIn(email, pw);
    setBusy(false);
    if (r.ok) toast.success(r.title, { description: r.message }); else setErr(r.message);
  };
  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-1.5">
        <Label>Sign in as</Label>
        <PersonPicker value={who} onChange={pick} />
      </div>
      <div className="relative flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground"><span className="h-px flex-1 bg-border" />or enter your details<span className="h-px flex-1 bg-border" /></div>
      <div className="grid gap-1.5"><Label htmlFor="em">Email</Label><Input id="em" type="email" autoComplete="username" className="h-11" placeholder="name@pcb.com.pk" value={email} onChange={(e) => { setEmail(e.target.value); setWho(""); }} /></div>
      <div className="grid gap-1.5">
        <Label htmlFor="pw">Password</Label>
        <div className="relative">
          <Input id="pw" type={show ? "text" : "password"} autoComplete="current-password" className="h-11 pr-10" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" onClick={() => setShow((x) => !x)} className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
        </div>
      </div>
      {err && <p className="rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs text-destructive">{err}</p>}
      <Button type="submit" size="lg" className="h-11 w-full" disabled={busy || !email || !pw}>{busy ? <Loader2 className="animate-spin" /> : <LogIn />} Sign in</Button>
    </form>
  );
}

const DEPTS = ["Procurement Wing", "Finance", "Stores & Custody Wing", "Grounds & Pitches", "High Performance Centre", "Men's National Team", "Women's National Team", "PSL Operations", "Internal Audit"];

function SignUpForm() {
  const roles = useApp((s) => s.roles);
  const signUp = useApp((s) => s.signUp);
  const [f, setF] = useState({ name: "", email: "", department: DEPTS[0], role: "storekeeper" as RoleKey, password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.password !== f.confirm) { setErr("The two passwords do not match."); return; }
    setBusy(true); setErr("");
    const r = await signUp(f);
    setBusy(false);
    if (r.ok) toast.success(r.title, { description: r.message }); else setErr(r.message);
  };
  return (
    <form onSubmit={submit} className="grid gap-3.5">
      <div className="grid gap-1.5"><Label htmlFor="nm">Full name</Label><Input id="nm" className="h-11" placeholder="e.g. Ayesha Khan" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div className="grid gap-1.5"><Label htmlFor="ne">Official email</Label><Input id="ne" type="email" className="h-11" placeholder="name@pcb.com.pk" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5"><Label>Department</Label><Select value={f.department} onValueChange={(v) => setF({ ...f, department: v })}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{DEPTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-1.5"><Label>Role</Label><Select value={f.role} onValueChange={(v) => setF({ ...f, role: v as RoleKey })}><SelectTrigger className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{SEEDED.map((u) => <SelectItem key={u.role} value={u.role}>{roles[u.role].label.replace(" (read-only)", "")}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5"><Label htmlFor="np">Password</Label><Input id="np" type="password" autoComplete="new-password" className="h-11" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></div>
        <div className="grid gap-1.5"><Label htmlFor="nc">Confirm password</Label><Input id="nc" type="password" autoComplete="new-password" className="h-11" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></div>
      </div>
      <p className="text-[11px] text-muted-foreground">{SCOPE[f.role]}. At least 8 characters for the password.</p>
      {err && <p className="rounded-md border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs text-destructive">{err}</p>}
      <Button type="submit" size="lg" className="h-11 w-full" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <UserPlus />} Create account</Button>
    </form>
  );
}

function Avatar({ k, initials, className }: { k: RoleKey; initials: string; className?: string }) {
  return <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-1", k === "auditor" ? "bg-muted text-muted-foreground ring-border" : "bg-primary/12 text-primary ring-primary/30", className)}>{initials}</span>;
}

function PersonPicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const roles = useApp((s) => s.roles);
  const [open, setOpen] = useState(false);
  const sel = SEEDED.find((u) => u.role === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-14 w-full items-center gap-3 rounded-lg border bg-card px-3 text-left transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
          {sel ? (
            <>
              <Avatar k={sel.role} initials={roles[sel.role].initials} />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{roles[sel.role].user}</span><span className="block truncate text-xs text-muted-foreground">{roles[sel.role].label}</span></span>
            </>
          ) : (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground"><Users className="size-4" /></span>
              <span className="flex-1 text-sm text-muted-foreground">Choose a PCB team member</span>
            </>
          )}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-[var(--radix-popover-trigger-width)] p-1.5">
        <ul className="grid gap-0.5">
          {SEEDED.map((u) => {
            const active = u.role === value;
            return (
              <li key={u.role}>
                <button type="button" onClick={() => { onChange(u.role); setOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-muted", active && "bg-primary/8")}>
                  <Avatar k={u.role} initials={roles[u.role].initials} className="size-8 text-[11px]" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{roles[u.role].user}</span><span className="block truncate text-xs text-muted-foreground">{roles[u.role].label.replace(" (read-only)", " · view only")}</span></span>
                  {active && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
