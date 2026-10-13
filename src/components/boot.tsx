"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, ChevronsUpDown, Eye, EyeOff, Loader2, LogIn, Moon, Shield, Sun } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { asset } from "@/lib/nav";
import { DEMO_PASSWORD, SEEDED, useApp } from "@/lib/store";
import type { RoleKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_DETAILS: Record<RoleKey, { title: string; badge: string; scope: string }> = {
  director: {
    title: "Director Procurement",
    badge: "DIR",
    scope: "Full approval & purchase order release authority",
  },
  committee: {
    title: "Procurement Committee Member",
    badge: "PC",
    scope: "Comparative statements & bid evaluations",
  },
  cfo: {
    title: "Chief Financial Officer (CFO)",
    badge: "CFO",
    scope: "High-value approvals, budget commitment & payments",
  },
  storekeeper: {
    title: "Central Storekeeper",
    badge: "SK",
    scope: "Central stores, demands, custody & goods receipt",
  },
  auditor: {
    title: "Statutory Auditor",
    badge: "AUD",
    scope: "Complete inspection of all records (view only)",
  },
};

export function SignIn() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="relative grid min-h-svh bg-background lg:grid-cols-[1.1fr_1fr]">
      <div className="absolute top-4 right-4 z-20">
        <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {mounted && resolvedTheme === "light" ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </div>
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

function AuthForms() {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
      <p className="mt-1 text-sm text-muted-foreground">Select your role or enter your official PCB email address.</p>
      <div className="mt-6">
        <SignInForm />
      </div>
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

function RoleBadge({ k, label }: { k: RoleKey; label: string }) {
  return (
    <span className={cn(
      "flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ring-1",
      k === "auditor" ? "bg-muted text-muted-foreground ring-border" : "bg-primary/12 text-primary ring-primary/30"
    )}>
      {label}
    </span>
  );
}

function PersonPicker({ value, onChange }: { value: string; onChange: (k: string) => void }) {
  const [open, setOpen] = useState(false);
  const sel = SEEDED.find((u) => u.role === value);
  const detail = sel ? ROLE_DETAILS[sel.role] : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="flex h-14 w-full items-center gap-3 rounded-lg border bg-card px-3 text-left transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none">
          {sel && detail ? (
            <>
              <RoleBadge k={sel.role} label={detail.badge} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{detail.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{detail.scope}</span>
              </span>
            </>
          ) : (
            <>
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-dashed text-muted-foreground"><Shield className="size-4" /></span>
              <span className="flex-1 text-sm text-muted-foreground">Select role / title</span>
            </>
          )}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-[var(--radix-popover-trigger-width)] p-1.5">
        <ul className="grid gap-0.5">
          {SEEDED.map((u) => {
            const active = u.role === value;
            const item = ROLE_DETAILS[u.role];
            return (
              <li key={u.role}>
                <button type="button" onClick={() => { onChange(u.role); setOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors hover:bg-muted", active && "bg-primary/8")}>
                  <RoleBadge k={u.role} label={item.badge} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{item.scope}</span>
                  </span>
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
