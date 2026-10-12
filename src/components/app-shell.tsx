"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Lock, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { AppSidebar } from "@/components/app-sidebar";
import { CommandMenu } from "@/components/command-menu";
import { NAV, navFor } from "@/lib/nav";
import { canAccess, useRole } from "@/lib/store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const nav = navFor(pathname);
  const role = useRole();
  const allowed = canAccess(role, nav.key);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
      if (n >= 1 && n <= NAV.length) router.push(NAV[n - 1].href);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

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
            <Button variant="outline" className="h-8 w-9 justify-start gap-2 px-2 text-muted-foreground sm:w-64 sm:px-3" onClick={() => setCmdOpen(true)}>
              <Search className="size-4" />
              <span className="hidden truncate text-[13px] sm:inline">Search code, PR, PO, vendor…</span>
              <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
            </Button>
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
                  <p className="text-sm text-muted-foreground">Access is set per role, at module, function and data level. Switch role from the menu at the bottom of the sidebar.</p>
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
