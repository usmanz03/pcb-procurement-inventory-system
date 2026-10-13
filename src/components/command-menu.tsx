"use client";

import { useRouter } from "next/navigation";
import { FileText, Package, ShoppingCart, Users, ClipboardCheck, Building2 } from "lucide-react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { NAV } from "@/lib/nav";
import { useApp } from "@/lib/store";

/* Global search by Item Code, PR, PO, vendor or department (FR-11.6) */
export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const router = useRouter();
  const items = useApp((s) => s.itemsMaster);
  const demands = useApp((s) => s.demands);
  const pos = useApp((s) => s.purchaseOrders);
  const vendors = useApp((s) => s.vendors);
  const approvals = useApp((s) => s.approvals);
  const go = (href: string) => { onOpenChange(false); router.push(href); };
  const depts = [...new Set(demands.map((d) => d.dept))];

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Search" description="Search item codes, PRs, POs, vendors and departments">
      <CommandInput placeholder="Search item code, PR, PO, vendor, department…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No matches.</CommandEmpty>
        <CommandGroup heading="Go to">
          {NAV.map((n, i) => (
            <CommandItem key={n.key} value={`go ${n.title}`} onSelect={() => go(n.href)}>
              <n.icon /> {n.title}
              <CommandShortcut>{i + 1}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Items">
          {items.map((i) => (
            <CommandItem key={i.code} value={`${i.code} ${i.name}`} onSelect={() => go(`/catalogue/?code=${i.code}`)}>
              <Package /> <span className="font-mono text-xs">{i.code}</span> <span className="truncate text-muted-foreground">{i.name}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Demands & requisitions">
          {demands.map((d) => (
            <CommandItem key={d.id} value={`${d.id} ${d.pr ?? ""} ${d.sin ?? ""} ${d.dept}`} onSelect={() => go(`/demands/?id=${d.id}`)}>
              <FileText /> <span className="font-mono text-xs">{d.id}</span> <span className="truncate text-muted-foreground">{d.dept} · {d.pr ?? d.sin}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Purchase orders">
          {pos.map((p) => (
            <CommandItem key={p.po} value={`${p.po} ${p.vendor} ${p.item}`} onSelect={() => go(`/orders/?po=${p.po}`)}>
              <ShoppingCart /> <span className="font-mono text-xs">{p.po}</span> <span className="truncate text-muted-foreground">{p.vendor}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Vendors">
          {vendors.map((v) => (
            <CommandItem key={v.id} value={`${v.name} ${v.ntn}`} onSelect={() => go("/items/")}>
              <Users /> {v.name} <span className="text-muted-foreground">NTN {v.ntn}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Approvals">
          {approvals.map((a) => (
            <CommandItem key={a.id} value={`${a.id} ${a.ref} ${a.title}`} onSelect={() => go(`/approvals/?id=${a.id}`)}>
              <ClipboardCheck /> <span className="font-mono text-xs">{a.id}</span> <span className="truncate text-muted-foreground">{a.title}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Departments">
          {depts.map((d) => (
            <CommandItem key={d} value={`department ${d}`} onSelect={() => go("/custody/")}>
              <Building2 /> {d}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
