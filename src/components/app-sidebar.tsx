"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Lock, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { asset, NAV, navFor } from "@/lib/nav";
import { canAccess, useApp, useRole } from "@/lib/store";
import type { RoleKey } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_ORDER: RoleKey[] = ["director", "committee", "cfo", "storekeeper", "auditor"];

export function AppSidebar() {
  const pathname = usePathname();
  const active = navFor(pathname);
  const role = useRole();
  const roleKey = useApp((s) => s.role);
  const roles = useApp((s) => s.roles);
  const setRole = useApp((s) => s.setRole);
  const reset = useApp((s) => s.reset);
  const pendingMine = useApp(
    (s) =>
      s.approvals.filter(
        (a) =>
          a.status === "pending" &&
          a.chain.find((c) => c.status === "pending")?.roleKey === s.role
      ).length
  );
  const groups = [...new Set(NAV.map((n) => n.group))];

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      {/* Brand Header */}
      <SidebarHeader className="border-b border-sidebar-border/60 px-3 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent px-1">
              <Link href="/" className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-white p-1.5 shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset("/pcb-logo.svg")} alt="Pakistan Cricket Board" className="h-full w-auto" />
                </span>
                <span className="grid leading-tight min-w-0">
                  <span className="truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                    Procurement & Stores
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    PPRA 2004 · FY 2026-27
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation Sections */}
      <SidebarContent className="px-2 py-3">
        {groups.map((g) => (
          <SidebarGroup key={g} className="py-1">
            <SidebarGroupLabel className="text-[10px] font-semibold tracking-wider text-muted-foreground/80 uppercase px-2.5 mb-0.5">
              {g}
            </SidebarGroupLabel>
            <SidebarMenu className="gap-0.5">
              {NAV.filter((n) => n.group === g).map((n) => {
                const idx = NAV.indexOf(n) + 1;
                const locked = !canAccess(role, n.key);
                const isActive = active.key === n.key;
                return (
                  <SidebarMenuItem key={n.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={`${n.title} · ${idx}`}
                      className={cn(
                        "h-8.5 rounded-lg px-2.5 text-xs font-medium transition-all duration-150",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold shadow-2xs"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground",
                        locked && "opacity-45"
                      )}
                    >
                      <Link href={n.href} className="flex items-center gap-2.5">
                        <n.icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            isActive ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        <span className="truncate">{n.title}</span>
                        {locked && <Lock className="ml-auto size-3 opacity-50" />}
                      </Link>
                    </SidebarMenuButton>
                    {n.key === "approvals" && pendingMine > 0 && !locked && (
                      <SidebarMenuBadge className="rounded-full bg-primary/15 text-primary border border-primary/20 px-1.5 py-0 text-[10px] font-semibold">
                        {pendingMine}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* User & Role Switcher Footer */}
      <SidebarFooter className="border-t border-sidebar-border/60 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="rounded-lg hover:bg-sidebar-accent transition-colors px-2"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary ring-1 ring-primary/25">
                    {role.initials}
                  </span>
                  <span className="grid flex-1 text-left leading-tight min-w-0">
                    <span className="truncate text-xs font-medium text-sidebar-foreground">
                      {role.user}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {role.label}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-64">
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Switch role (demo)
                </DropdownMenuLabel>
                {ROLE_ORDER.map((k) => (
                  <DropdownMenuItem key={k} onClick={() => setRole(k)} className="gap-3">
                    <span className="flex size-7 items-center justify-center rounded-md bg-muted text-[10px] font-bold">
                      {roles[k].initials}
                    </span>
                    <span className="grid leading-tight">
                      <span className="text-sm font-medium">{roles[k].user}</span>
                      <span className="text-[11px] text-muted-foreground">{roles[k].label}</span>
                    </span>
                    {k === roleKey && <Check className="ml-auto size-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    reset();
                    toast.success("Demo data reset");
                  }}
                >
                  <RotateCcw className="size-3.5 mr-2" /> Reset demo data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
