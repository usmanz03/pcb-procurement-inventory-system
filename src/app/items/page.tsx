"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgeAlert,
  Boxes,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  Filter,
  Info,
  Lock,
  Plus,
  QrCode,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Trophy,
  UserX,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarList, Empty, KpiGrid, Meter, PageHeader, Section, Stat, Status, type Tone } from "@/components/dash";
import { ItemSheet } from "@/components/item-sheet";
import { QrLabelDialog } from "@/components/qr-label";
import { useApp, useRole } from "@/lib/store";
import { num, pkr } from "@/lib/domain";
import type { Item, Vendor } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORIES: Record<string, { label: string; subs: Record<string, string> }> = {
  SPO: { label: "Sports gear", subs: { BALL: "Cricket balls", BAT: "Bats", PAD: "Protective pads" } },
  INF: { label: "Infrastructure", subs: { LGT: "Floodlights", SCB: "Scoreboards", CVR: "Covers" } },
  TRF: { label: "Turf & pitch machinery", subs: { MOW: "Mowers", ROL: "Rollers", PEN: "Penetrometers" } },
  APP: { label: "Apparel", subs: { KIT: "Team kits", BAG: "Kit bags" } },
  MED: { label: "Medical & high performance", subs: { REC: "Recovery", GPS: "Athlete tracking" } },
  BRD: { label: "Broadcast & technology", subs: { HWK: "Ball tracking", CAM: "Cameras" } },
};

export default function ItemsPage() {
  return (
    <Suspense>
      <Items />
    </Suspense>
  );
}

function Items() {
  const s = useApp();
  const role = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<"catalogue" | "vendors" | "codifier">("vendors");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [budgetFilter, setBudgetFilter] = useState("all");
  const [sheetCode, setSheetCode] = useState<string | null>(null);

  // Blacklist dialog state
  const [blacklistVendor, setBlacklistVendor] = useState<Vendor | null>(null);
  const [blacklistReason, setBlacklistReason] = useState("Repeated delivery defaults and substandard test batch results.");
  const [blacklistPeriod, setBlacklistPeriod] = useState("2 years");

  // QR label preview modal
  const [qrItem, setQrItem] = useState<Item | null>(null);
  const [vendorOpen, setVendorOpen] = useState(false);

  // Codifier State
  const [catKey, setCatKey] = useState("SPO");
  const [subKey, setSubKey] = useState("BALL");
  const [desc, setDesc] = useState("Kookaburra Turf pink match balls (4-piece seam)");
  const [uom, setUom] = useState("Box (12 pcs)");
  const [nature, setNature] = useState<"Consumable" | "Non-consumable asset">("Consumable");
  const [exp, setExp] = useState<"OpEx" | "CapEx">("OpEx");
  const [reorder, setReorder] = useState(25);
  const [warranty, setWarranty] = useState("12 months manufacturer warranty");
  const [usefulLife, setUsefulLife] = useState("5 years");
  const [depreciation, setDepreciation] = useState("Straight line 20% p.a.");

  const currentCat = CATEGORIES[catKey] ?? CATEGORIES.SPO;
  const currentSubs = currentCat.subs;

  // Next Code Computation
  const nextAvailableCode = useMemo(() => {
    const prefix = `PCB-${catKey}-${subKey}-`;
    const used = s.itemsMaster
      .filter((i) => i.code.startsWith(prefix))
      .map((i) => parseInt(i.code.slice(-4), 10));
    const pending = s.approvals
      .filter((a) => a.type === "Item Code Request" && a.ref.startsWith(prefix))
      .map((a) => parseInt(a.ref.slice(-4), 10));
    const maxSeq = Math.max(0, ...used, ...pending);
    return `${prefix}${String(maxSeq + 1).padStart(4, "0")}`;
  }, [catKey, subKey, s.itemsMaster, s.approvals]);

  // Duplicate Check
  const duplicateHits = useMemo(() => {
    if (!desc.trim()) return [];
    const stopWords = new Set(["of", "the", "and", "for", "box", "set", "unit", "pcs", "12", "with", "match", "balls"]);
    const words = desc.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stopWords.has(w));
    if (words.length === 0) return [];

    return s.itemsMaster
      .map((i) => {
        const nameLower = i.name.toLowerCase();
        const hits = words.filter((w) => nameLower.includes(w)).length;
        return { item: i, score: hits / words.length };
      })
      .filter((x) => x.score >= 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [desc, s.itemsMaster]);

  // Submit Codifier
  const handleRequestCode = () => {
    if (!desc.trim()) {
      toast.error("Description required", { description: "Please enter a descriptive item name." });
      return;
    }
    const dup = duplicateHits[0];
    const res = s.requestItemCode({
      code: nextAvailableCode,
      desc,
      nature,
      exp,
      uom,
      dupOf: dup ? dup.item.code : undefined,
    });
    if (res.ok) {
      toast.success(res.title, { description: res.message });
      setDesc("");
      setActiveTab("catalogue");
    } else {
      toast.error(res.title, { description: res.message });
    }
  };

  // Blacklist submission
  const handleBlacklistSubmit = () => {
    if (!blacklistVendor) return;
    const res = s.proposeBlacklist(blacklistVendor.id, blacklistReason, blacklistPeriod);
    if (res.ok) {
      toast.success(res.title, { description: res.message });
      setBlacklistVendor(null);
    } else {
      toast.error(res.title, { description: res.message });
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return s.itemsMaster.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
      const matchesCat = categoryFilter === "all" || item.categoryCode === categoryFilter;
      const matchesBudget = budgetFilter === "all" || item.budgetType === budgetFilter;
      return matchesSearch && matchesCat && matchesBudget;
    });
  }, [s.itemsMaster, searchQuery, categoryFilter, budgetFilter]);

  // Stats
  const totalStockValue = s.stadiumStores.reduce((acc, st) => acc + st.valuationPkr, 0);
  const eligibleVendors = s.vendors.filter((v) => v.status === "Eligible");
  const expiringCompliance = s.vendors.filter((v) => v.expiryDays <= 30 && v.status === "Eligible");

  return (
    <>
      <PageHeader
        module="Master data"
        title="Vendors"
        description="Register suppliers, check their tax status, score their prequalification and keep debarred firms out of every invitation."
        actions={!role.readOnly && <Button onClick={() => setVendorOpen(true)}><Plus className="size-4" /> Register vendor</Button>}
      />

      <KpiGrid
        items={[
          {
            label: "Total catalogued items",
            value: s.itemsMaster.length,
            icon: Boxes,
            hero: true,
            foot: "Rigid category-subcategory hierarchy",
          },
          {
            label: "Catalogue valuation",
            prefix: "PKR",
            value: totalStockValue / 1e6,
            decimals: 1,
            suffix: "M",
            icon: Trophy,
            foot: "Weighted average cost basis",
          },
          {
            label: "Prequalified active vendors",
            value: eligibleVendors.length,
            suffix: ` / ${s.vendors.length}`,
            icon: Building2,
            foot: "Active on FBR ATL & compliance checked",
          },
          {
            label: "Compliance expirations in 30d",
            value: expiringCompliance.length,
            icon: BadgeAlert,
            delta: expiringCompliance.length
              ? { dir: "down", text: "Action required", good: false }
              : { dir: "flat", text: "All docs current" },
            foot: "Tax, ISO or PEC renewal due",
          },
        ]}
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-3">
          <TabsList className="h-auto max-w-full flex-wrap justify-start bg-muted/70">
            <TabsTrigger value="vendors" className="gap-2">
              <Users className="size-4" /> Vendor directory ({s.vendors.length})
            </TabsTrigger>
          </TabsList>
          {activeTab === "catalogue" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search code, name, category…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36 text-xs h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {Object.keys(CATEGORIES).map((k) => (
                    <SelectItem key={k} value={k}>
                      {k} · {CATEGORIES[k].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={budgetFilter} onValueChange={setBudgetFilter}>
                <SelectTrigger className="w-28 text-xs h-9">
                  <SelectValue placeholder="Budget" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="OpEx">OpEx</SelectItem>
                  <SelectItem value="CapEx">CapEx</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* ----------------- TAB 1: CATALOGUE ----------------- */}
        {activeTab === "catalogue" && (
          <Section
            title="Item master catalogue"
            description="Official PCB Item Codes following standard hierarchy. Click any row for store distribution and ledger movements."
            flush
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Item code</TableHead>
                  <TableHead>Description & specification</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Total stock</TableHead>
                  <TableHead className="text-right">Re-order level</TableHead>
                  <TableHead className="text-right">WAC (PKR)</TableHead>
                  <TableHead className="text-right pr-5">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => {
                  const isLow = item.totalStock <= item.reorderLevel;
                  return (
                    <TableRow
                      key={item.code}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSheetCode(item.code)}
                    >
                      <TableCell className="pl-5 font-mono text-xs font-semibold text-primary">
                        {item.code}
                      </TableCell>
                      <TableCell className="max-w-[20rem]">
                        <div className="font-medium text-xs text-foreground truncate">{item.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{item.spec}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={item.budgetType === "CapEx" ? "default" : "secondary"} className="text-[10px] py-0">
                            {item.budgetType}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0">
                            {item.classification.includes("Asset") ? "Asset" : "Consumable"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{item.uom}</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold tabular">
                        {num(item.totalStock)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 text-warning font-semibold">
                            <AlertTriangle className="size-3" /> {item.reorderLevel}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{item.reorderLevel}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular font-medium">
                        {num(item.avgCostPkr)}
                      </TableCell>
                      <TableCell className="text-right pr-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-2"
                            onClick={() => setQrItem(item)}
                          >
                            <QrCode className="size-3.5" /> Tag
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs px-2 text-primary"
                            onClick={() => setSheetCode(item.code)}
                          >
                            <Eye className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Empty>No catalogue items match your filters.</Empty>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Section>
        )}

        {/* ----------------- TAB 2: VENDORS ----------------- */}
        {activeTab === "vendors" && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]">
              <Section
                title="Vendor qualification & compliance register"
                description="Tax registration checked, prequalification scored, document expiry tracked, and debarred vendors blocked from every invitation."
                flush
                action={!role.readOnly && <Button size="sm" onClick={() => setVendorOpen(true)}><Plus className="size-4" /> Register vendor</Button>}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Vendor name</TableHead>
                      <TableHead>NTN / FBR</TableHead>
                      <TableHead className="w-32">Prequal score</TableHead>
                      <TableHead className="text-right">On-time %</TableHead>
                      <TableHead>Compliance doc</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right pr-5">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.vendors.map((v) => {
                      const isBlacklisted = v.status === "Blacklisted";
                      const isProposed = v.status === "Blacklisting proposed";
                      const isExpiringSoon = v.expiryDays <= 30 && v.expiryDays >= 0;
                      const isExpired = v.expiryDays < 0;

                      return (
                        <TableRow
                          key={v.id}
                          className={cn(isBlacklisted && "opacity-60 bg-muted/30")}
                        >
                          <TableCell className="pl-5 max-w-[14rem]">
                            <div className="font-semibold text-xs text-foreground truncate">{v.name}</div>
                            <div className="text-[11px] text-muted-foreground">{v.category}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-mono text-xs">{v.ntn}</div>
                            <div className="text-[10px]">
                              {v.atl ? (
                                <span className="text-success font-medium flex items-center gap-0.5">
                                  <Check className="size-3" /> Active ATL
                                </span>
                              ) : (
                                <span className="text-destructive font-medium flex items-center gap-0.5">
                                  Non-filer
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Meter
                                value={v.prequal}
                                tone={v.prequal >= 80 ? "primary" : v.prequal >= 70 ? "warning" : "danger"}
                              />
                              <div className="text-[11px] font-mono tabular text-muted-foreground">
                                {v.prequal} / 100
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular font-semibold">
                            <span className={v.onTime < 80 ? "text-destructive" : "text-success"}>
                              {v.onTime}%
                            </span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-[11px]">{v.nextDoc}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {isExpired ? (
                                <span className="text-destructive font-bold">Expired ({v.nextExpiry})</span>
                              ) : isExpiringSoon ? (
                                <span className="text-warning font-semibold">
                                  Expires in {v.expiryDays}d ({v.nextExpiry})
                                </span>
                              ) : (
                                <span>Valid to {v.nextExpiry}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isBlacklisted ? (
                              <Status tone="danger" icon={Lock}>
                                Debarred {v.until ? `till ${v.until}` : ""}
                              </Status>
                            ) : isProposed ? (
                              <Status tone="warning" icon={ShieldAlert}>
                                Blacklisting proposed
                              </Status>
                            ) : v.status === "Not qualified" ? (
                              <Status tone="neutral">Not qualified</Status>
                            ) : (
                              <Status tone="success" icon={CheckCircle2}>
                                Eligible
                              </Status>
                            )}
                            {v.registeredOn && <div className="mt-1 text-[10px] text-muted-foreground">Registered {v.registeredOn}</div>}
                          </TableCell>
                          <TableCell className="text-right pr-5">
                            {v.status === "Eligible" && !role.readOnly ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => setBlacklistVendor(v)}
                              >
                                <UserX className="size-3.5 mr-1" /> Debar
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Section>

              <Section
                title="Vendor prequalification ranking"
                description="Ranked by technical capability, financial health, and past performance history."
              >
                <BarList
                  rows={s.vendors.map((v) => ({
                    name: v.name.split(" (")[0],
                    value: v.prequal,
                    color: v.status === "Blacklisted" ? "var(--destructive)" : v.prequal < 75 ? "var(--warning)" : "var(--primary)",
                    hint: `${v.name}: ${v.prequal}/100`,
                  }))}
                  format={(v) => `${v} pts`}
                  max={100}
                />
                <div className="mt-4 pt-3 border-t text-xs text-muted-foreground flex items-center justify-between">
                  <span>Minimum qualifying threshold: 70 points</span>
                  <Badge variant="outline" className="text-[10px]">PPRA Rule 15</Badge>
                </div>
              </Section>
            </div>
          </div>
        )}

        {/* ----------------- TAB 3: CODIFIER ----------------- */}
        {activeTab === "codifier" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <Section
              title="Intelligent item code builder"
              description="Standardized naming and categorization according to PCB Materiel Nomenclature Rules."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label>Category</Label>
                  <Select
                    value={catKey}
                    onValueChange={(val) => {
                      setCatKey(val);
                      const subKeys = Object.keys(CATEGORIES[val]?.subs ?? {});
                      if (subKeys.length > 0) setSubKey(subKeys[0]);
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORIES).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {k} · {v.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label>Sub-category</Label>
                  <Select value={subKey} onValueChange={setSubKey}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(currentSubs).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {k} · {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 grid gap-1.5">
                  <Label htmlFor="desc">Item description & specification</Label>
                  <Input
                    id="desc"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    placeholder="e.g. Kookaburra pink match balls (box of 12)"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Live duplicate matching against existing item descriptions occurs in real time.
                  </p>
                </div>

                <div className="grid gap-1.5">
                  <Label>Unit of measure</Label>
                  <Select value={uom} onValueChange={setUom}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Box (12 pcs)", "Unit", "Set", "Pair", "Kg", "Litre", "Meter"].map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label>Item nature</Label>
                  <Select
                    value={nature}
                    onValueChange={(v: any) => {
                      setNature(v);
                      setExp(v === "Non-consumable asset" ? "CapEx" : "OpEx");
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Consumable">Consumable</SelectItem>
                      <SelectItem value="Non-consumable asset">Non-consumable asset</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label>Budget expenditure</Label>
                  <Select value={exp} onValueChange={(v: any) => setExp(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OpEx">OpEx (Operating)</SelectItem>
                      <SelectItem value="CapEx">CapEx (Capital)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="reorder">Re-order threshold level</Label>
                  <Input
                    id="reorder"
                    type="number"
                    value={reorder}
                    onChange={(e) => setReorder(+e.target.value)}
                  />
                </div>

                {nature === "Non-consumable asset" && (
                  <div className="col-span-2 grid gap-3 border-t pt-3 mt-1 sm:grid-cols-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="war">Warranty</Label>
                      <Input
                        id="war"
                        value={warranty}
                        onChange={(e) => setWarranty(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="life">Useful life</Label>
                      <Input
                        id="life"
                        value={usefulLife}
                        onChange={(e) => setUsefulLife(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="dep">Depreciation</Label>
                      <Input
                        id="dep"
                        value={depreciation}
                        onChange={(e) => setDepreciation(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <Button onClick={handleRequestCode}>
                  <Sparkles className="size-4 mr-1 text-gold" /> Submit code for approval
                </Button>
              </div>
            </Section>

            {/* Next Available Code & Duplicate Checker Result */}
            <div className="space-y-6">
              <Section
                title="Generated code assignment"
                description="Deterministic identifier reserved upon Catalogue Officer sign-off."
              >
                <div className="rounded-xl border bg-muted/30 p-5 text-center">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Next available code
                  </div>
                  <div className="mt-2 font-mono text-3xl font-bold tracking-tight text-primary">
                    {nextAvailableCode}
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <Badge variant="outline">{exp}</Badge>
                    <Badge variant="secondary">{nature}</Badge>
                    <Badge variant="secondary">{uom}</Badge>
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground">
                    Category: {currentCat.label} · Sub: {currentSubs[subKey]}
                  </p>
                </div>
              </Section>

              <Section
                title="Duplicate verification engine"
                description="Checks semantic similarity against existing approved catalogue entries."
              >
                {duplicateHits.length > 0 ? (
                  <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-warning font-semibold text-xs">
                      <AlertTriangle className="size-4" /> Potential duplicate identified:
                    </div>
                    <div className="space-y-2">
                      {duplicateHits.map(({ item, score }) => (
                        <div
                          key={item.code}
                          className="rounded-md border bg-background/80 p-2 text-xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <span className="font-mono font-semibold text-primary">{item.code}</span>
                            <div className="font-medium text-foreground">{item.name}</div>
                          </div>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {Math.round(score * 100)}% match
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      If this item represents the same specification, please indent using the existing code.
                      Proceeding will require catalogue justification.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-xs space-y-1">
                    <div className="flex items-center gap-2 text-success font-semibold">
                      <CheckCircle2 className="size-4" /> No duplicate detected
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      This item specification does not match any current catalogue entries. Ready for induction.
                    </p>
                  </div>
                )}
              </Section>
            </div>
          </div>
        )}
      </Tabs>

      {/* Item Drawer Sheet */}
      <ItemSheet code={sheetCode} onOpenChange={(open) => !open && setSheetCode(null)} />

      {/* Blacklist Vendor Modal */}
      <Dialog open={!!blacklistVendor} onOpenChange={(open) => !open && setBlacklistVendor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" /> Propose vendor blacklisting
            </DialogTitle>
            <DialogDescription>
              Debarment proposal under PPRA Rule 19 for {blacklistVendor?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="bl-period">Debarment duration</Label>
              <Select value={blacklistPeriod} onValueChange={setBlacklistPeriod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="6 months">6 months</SelectItem>
                  <SelectItem value="1 year">1 year</SelectItem>
                  <SelectItem value="2 years">2 years (standard debarment)</SelectItem>
                  <SelectItem value="3 years">3 years (severe default)</SelectItem>
                  <SelectItem value="Permanent">Permanent exclusion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bl-reason">Statutory justification & evidence</Label>
              <Textarea
                id="bl-reason"
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="Cite PO reference, inspection rejections, or hearing findings..."
                rows={4}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Proposals are routed to the Procurement Committee and Director Procurement before debarment takes effect.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlacklistVendor(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBlacklistSubmit}>
              Submit blacklisting proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QrLabelDialog code={qrItem?.code ?? null} title={qrItem?.name} sub={qrItem ? `Gaddafi Stadium Central Store · ${qrItem.uom}` : undefined} onClose={() => setQrItem(null)} />
      <VendorDialog open={vendorOpen} onOpenChange={setVendorOpen} />
    </>
  );
}

const VENDOR_CATEGORIES = ["Sports equipment", "Stadium infrastructure", "Turf & grounds", "Broadcast & technology", "Medical & sports science", "Apparel & kits", "Services"];

function VendorDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const s = useApp();
  const [f, setF] = useState({ name: "Pak Turf Solutions (Pvt) Ltd", ntn: "4471209-3", strn: "3277876175852", category: VENDOR_CATEGORIES[2], email: "tenders@pakturf.pk", phone: "+92 42 3578 1100", address: "Plot 14, Sundar Industrial Estate, Lahore", financial: 78, technical: 82, past: 70, turnover: 64 });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: ["financial", "technical", "past", "turnover"].includes(k) ? +e.target.value : e.target.value });
  const score = Math.round(f.financial * 0.3 + f.technical * 0.35 + f.past * 0.2 + f.turnover * 0.15);
  const ntnOk = /^\d{7}-\d$/.test(f.ntn.trim());
  const submit = () => {
    const r = s.registerVendor(f);
    if (!r.ok) { toast.error(r.title, { description: r.message }); return; }
    toast.success(r.title, { description: r.message });
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Register a vendor</DialogTitle><DialogDescription>Company details, tax registration and prequalification. Vendors scoring under 60 cannot be invited to quote.</DialogDescription></DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5 sm:col-span-2"><Label htmlFor="vn">Registered company name</Label><Input id="vn" value={f.name} onChange={set("name")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="vt">NTN</Label><Input id="vt" value={f.ntn} onChange={set("ntn")} placeholder="1234567-8" />{!ntnOk && <span className="text-[11px] text-destructive">Format 1234567-8</span>}</div>
          <div className="grid gap-1.5"><Label htmlFor="vs">Sales tax registration (STRN)</Label><Input id="vs" value={f.strn} onChange={set("strn")} /></div>
          <div className="grid gap-1.5"><Label>Category of supply</Label><Select value={f.category} onValueChange={(v) => setF({ ...f, category: v })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent>{VENDOR_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label htmlFor="ve">Email</Label><Input id="ve" value={f.email} onChange={set("email")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="vp">Phone</Label><Input id="vp" value={f.phone} onChange={set("phone")} /></div>
          <div className="grid gap-1.5"><Label htmlFor="va">Address</Label><Input id="va" value={f.address} onChange={set("address")} /></div>
        </div>
        <div className="rounded-xl border bg-muted/30 p-4">
          <div className="mb-3 flex items-center justify-between"><span className="text-[13px] font-semibold">Prequalification</span><Status tone={score >= 60 ? "success" : "danger"}>{score} / 100 · {score >= 60 ? "Qualifies" : "Does not qualify"}</Status></div>
          <div className="grid gap-3 sm:grid-cols-2">
            {([["financial", "Financial capacity", 30], ["technical", "Technical capability", 35], ["past", "Past performance", 20], ["turnover", "Annual turnover", 15]] as const).map(([k, l, w]) => (
              <div key={k} className="grid gap-1">
                <div className="flex justify-between text-xs"><span>{l} <span className="text-muted-foreground">({w}%)</span></span><b className="font-mono">{f[k]}</b></div>
                <input type="range" min={0} max={100} value={f[k]} onChange={set(k)} className="accent-[var(--primary)]" />
              </div>
            ))}
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={submit} disabled={!ntnOk || !f.name.trim()}>Register vendor</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
