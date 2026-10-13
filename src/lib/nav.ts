import { Award, BarChart3, Boxes, Building2, ClipboardList, ClipboardCheck, Gavel, LayoutDashboard, Route, Scale, ShieldCheck, Truck, UserCheck, Warehouse, type LucideIcon } from "lucide-react";

export interface NavItem { href: string; key: string; title: string; module: string; icon: LucideIcon; group: string }

/* Ordered along the procurement lifecycle; number keys 1–9 follow this order. */
export const NAV: NavItem[] = [
  { href: "/", key: "overview", title: "Dashboard", module: "Module 11", icon: LayoutDashboard, group: "Overview" },
  { href: "/catalogue/", key: "catalogue", title: "Item master", module: "Module 0", icon: Boxes, group: "Master data" },
  { href: "/items/", key: "items", title: "Vendors", module: "Module 4", icon: Building2, group: "Master data" },
  { href: "/demands/", key: "demands", title: "Demands", module: "Module 1", icon: ClipboardList, group: "Stores" },
  { href: "/inventory/", key: "inventory", title: "Stores & stock", module: "Module 2", icon: Warehouse, group: "Stores" },
  { href: "/custody/", key: "custody", title: "Custody", module: "Module 3", icon: UserCheck, group: "Stores" },
  { href: "/sourcing/", key: "sourcing", title: "Sourcing & evaluation", module: "Modules 5 & 6", icon: Gavel, group: "Procurement" },
  { href: "/approvals/", key: "approvals", title: "Approvals", module: "Module 7", icon: ClipboardCheck, group: "Procurement" },
  { href: "/orders/", key: "orders", title: "PO & goods receipt", module: "Modules 8 & 9", icon: Truck, group: "Procurement" },
  { href: "/finance/", key: "finance", title: "Three-way match", module: "Module 10", icon: Scale, group: "Finance" },
  { href: "/reports/", key: "reports", title: "Reports", module: "Module 11", icon: BarChart3, group: "Finance" },
  { href: "/trace/", key: "trace", title: "Track an item", module: "Traceability", icon: Route, group: "Assurance" },
  { href: "/system/", key: "system", title: "Controls & audit", module: "Compliance", icon: ShieldCheck, group: "Assurance" },
  { href: "/commitment/", key: "commitment", title: "Our commitment", module: "Techprysm", icon: Award, group: "Assurance" },
];

export const navFor = (pathname: string) => {
  const p = pathname.replace(process.env.NEXT_PUBLIC_BASE_PATH ?? "", "") || "/";
  return NAV.find((n) => (n.href === "/" ? p === "/" : p.startsWith(n.href.replace(/\/$/, "")))) ?? NAV[0];
};

export const asset = (path: string) => `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${path}`;
