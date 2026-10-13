"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Lock, Moon, Search, Sun } from "lucide-react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/command-menu";
import { LiveIndicator, SignIn } from "@/components/boot";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { NAV, navFor } from "@/lib/nav";
import { canAccess, startSync, useApp, useRole } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = navFor(pathname);
  const role = useRole();
  const allowed = canAccess(role, nav.key);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); startSync(); }, []);
  const signedIn = useApp((st) => st.sync.signedIn);

  // ⌘K opens search; number keys 1–9 follow the procurement lifecycle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "k" || e.code === "KeyK")) {
        e.preventDefault();
        setCmdOpen((o) => !o);
        return;
      }
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("[role=dialog]")) return;
      const n = parseInt(e.key, 10);
      const st = useApp.getState();
      const vis = NAV.filter((x) => canAccess(st.roles[st.role], x.key));
      if (n >= 1 && n <= vis.length) router.push(vis[n - 1].href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  if (!mounted) return null;
  if (!signedIn && nav.key === "trace") return (
    <div className="min-h-svh bg-background">
      <header className="flex h-14 items-center justify-between border-b px-4 md:px-8">
        <span className="text-sm font-semibold">Pakistan Cricket Board · Asset trace</span>
        <Button size="sm" variant="outline" asChild><Link href="/">Sign in</Link></Button>
      </header>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8">{children}</main>
    </div>
  );
  if (!signedIn) return <><SignIn /><Toaster position="bottom-right" richColors closeButton /></>;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0 bg-background">
        <header className="app-header sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/75 px-4 backdrop-blur-xl md:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              <BreadcrumbItem className="hidden sm:block">{nav.group}</BreadcrumbItem>
              <BreadcrumbSeparator className="hidden sm:block" />
              <BreadcrumbItem><BreadcrumbPage className="truncate font-medium">{nav.title}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <LiveIndicator />
            <Button variant="outline" className="h-8 w-9 justify-start gap-2 px-2 text-muted-foreground sm:w-64 sm:px-3" onClick={() => setCmdOpen(true)}>
              <Search className="size-4" />
              <span className="hidden truncate text-[13px] sm:inline">Search code, PR, PO, vendor…</span>
              <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
            </Button>
            <Notifications />
            <Button variant="ghost" size="icon" aria-label="Toggle theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {mounted && resolvedTheme === "light" ? <Moon /> : <Sun />}
            </Button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1480px] px-4 py-6 md:px-8 md:py-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname + String(allowed)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {allowed ? children : (
                <div className="mx-auto mt-20 flex max-w-md flex-col items-center gap-3 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-muted"><Lock className="size-5 text-muted-foreground" /></span>
                  <h1 className="text-xl font-semibold">{nav.title} isn&apos;t available to {role.label}</h1>
                  <p className="text-sm text-muted-foreground">Access is set per role, at module, function and data level. Sign in with an authorised account to access this section.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </SidebarInset>
      <CommandMenu open={cmdOpen} onOpenChange={setCmdOpen} />
      <Toaster position="bottom-right" richColors closeButton />
    </SidebarProvider>
  );
}

function Notifications() {
  const acts = useApp((s) => s.recentActivities);
  const [seen, setSeen] = useState<string | null>(() => { try { return localStorage.getItem("pcb.seen"); } catch { return null; } });
  const idx = seen ? acts.findIndex((a) => a.id === seen) : -1;
  const unread = idx === -1 ? Math.min(acts.length, seen ? 9 : 3) : idx;
  const markRead = () => { const top = acts[0]?.id ?? null; setSeen(top); try { if (top) localStorage.setItem("pcb.seen", top); } catch { /* storage unavailable */ } };
  return (
    <Popover onOpenChange={(o) => !o && markRead()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell />
          {unread > 0 && <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3"><span className="text-sm font-semibold">Notifications</span><span className="text-[11px] text-muted-foreground">From the audit log</span></div>
        <ul className="max-h-96 divide-y overflow-y-auto">
          {acts.slice(0, 12).map((a, i) => (
            <li key={a.id} className="flex gap-3 px-4 py-2.5">
              <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${i < unread ? "bg-primary" : "bg-muted-foreground/30"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2"><span className="truncate text-[13px] font-medium">{a.title}</span><span className="shrink-0 text-[10px] text-muted-foreground">{a.time}</span></div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{a.desc}</p>
                <p className="text-[10px] text-muted-foreground/80">{a.user} · {a.badge}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t p-2"><Button variant="ghost" size="sm" className="w-full" asChild><Link href="/reports/?type=activity">Open activity log</Link></Button></div>
      </PopoverContent>
    </Popover>
  );
}
