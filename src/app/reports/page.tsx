"use client";

import { Suspense, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Mail,
  Package,
  Printer,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AreaTrend, BarList, Empty, KpiGrid, Meter, PageHeader, Section, SingleBars, StackedBars, Stat, Status, type Tone } from "@/components/dash";
import { useApp, useRole } from "@/lib/store";
import { computeLedger, fmtD, mil, num, periodRange, pkr, TODAY, TODAY_STR, type PeriodKey } from "@/lib/domain";
import type { Item, LedgerType, Vendor } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<LedgerType, string> = {
  OPEN: "Opening balance",
  GRN: "Receipt (GRN)",
  ISSUE: "Stores issue",
  TRANSFER_OUT: "Transfer out",
  TRANSFER_IN: "Transfer in",
  RETURN: "Return to store",
  ADJUST: "Stock-take adjustment",
};

const TYPE_TONE: Record<LedgerType, Tone> = {
  OPEN: "neutral",
  GRN: "success",
  ISSUE: "neutral",
  TRANSFER_OUT: "info",
  TRANSFER_IN: "info",
  RETURN: "neutral",
  ADJUST: "warning",
};

export default function ReportsPage() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}

function Reports() {
  const s = useApp();
  const role = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL query params
  const initialType = (searchParams.get("type") as any) ?? "ledger";
  const initialItem = searchParams.get("item") ?? s.itemsMaster[0]?.code ?? "PCB-SPO-BALL-0001";

  const [reportType, setReportType] = useState<"ledger" | "vendors" | "procurement" | "inventory" | "activity">(initialType);
  const [period, setPeriod] = useState<PeriodKey>("fytd");
  const [customRange, setCustomRange] = useState({ from: "2026-07-01", to: "2026-10-13" });
  const [selectedItemCode, setSelectedItemCode] = useState(initialItem);

  // Schedule modal
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [schedName, setSchedName] = useState("Consolidated inventory & stock ledger");
  const [schedFreq, setSchedFreq] = useState("Monthly");
  const [schedTo, setSchedTo] = useState("cfo@pcb.com.pk, audit@pcb.com.pk");
  const [schedFmt, setSchedFmt] = useState("PDF + Excel");

  // Period Date Range
  const range = useMemo(() => {
    return periodRange(period, customRange);
  }, [period, customRange]);

  // Selected item & ledger computation
  const currentItem = s.itemsMaster.find((i) => i.code === selectedItemCode) ?? s.itemsMaster[0];
  const ledgerData = useMemo(() => {
    const rawLedger = s.itemLedgers[selectedItemCode];
    if (!rawLedger) return null;
    return computeLedger(rawLedger, range.from, range.to);
  }, [s.itemLedgers, selectedItemCode, range]);

  // Export functions
  const handleExportExcel = () => {
    toast.success("Excel workbook generated", {
      description: `Report '${reportType}' (${range.label}) downloaded.`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveSchedule = () => {
    const res = s.scheduleReport({
      name: schedName,
      freq: schedFreq,
      to: schedTo,
      fmt: schedFmt,
    });
    if (res.ok) {
      toast.success(res.title, { description: res.message });
      setScheduleOpen(false);
    }
  };

  return (
    <>
      <PageHeader
        module="Module 11 · Statutory Registers & Analytics"
        title="Reports & business intelligence"
        description="Statutory perpetual stock ledger with Weighted Average Cost (WAC), vendor scorecards, budget variance, and tamper-evident audit logs."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setScheduleOpen(true)}>
              <Calendar className="size-4" /> Schedule automated delivery
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="size-4" /> Excel (.xlsx)
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="size-4" /> Print / PDF
            </Button>
          </div>
        }
      />

      {/* Control Bar: Report Type & Period Selector */}
      <div className="card-lift no-print mb-6 rounded-xl border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={reportType} onValueChange={(v) => setReportType(v as any)} className="w-auto">
            <TabsList className="bg-muted/70 flex flex-wrap">
              <TabsTrigger value="ledger" className="gap-2">
                <FileText className="size-4" /> Item ledger
              </TabsTrigger>
              <TabsTrigger value="vendors" className="gap-2">
                <Users className="size-4" /> Vendor performance
              </TabsTrigger>
              <TabsTrigger value="procurement" className="gap-2">
                <TrendingUp className="size-4" /> Procurement summary
              </TabsTrigger>
              <TabsTrigger value="inventory" className="gap-2">
                <Warehouse className="size-4" /> Inventory position
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <History className="size-4" /> Activity & audit trail
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Period selector */}
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={period} onValueChange={(v) => setPeriod(v as any)} className="w-auto">
              <TabsList className="bg-muted/70">
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="quarter">Quarter</TabsTrigger>
                <TabsTrigger value="fytd">FYTD</TabsTrigger>
                <TabsTrigger value="custom">Custom</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Sub-toolbar: Active Range Badge & Item Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline" className="gap-1.5 py-1 px-2.5">
              <Calendar className="size-3 text-primary" /> {range.label}
            </Badge>
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customRange.from}
                  onChange={(e) => setCustomRange((prev) => ({ ...prev, from: e.target.value }))}
                  className="h-8 w-36 text-xs"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={customRange.to}
                  onChange={(e) => setCustomRange((prev) => ({ ...prev, to: e.target.value }))}
                  className="h-8 w-36 text-xs"
                />
              </div>
            )}
          </div>

          {reportType === "ledger" && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Select catalogue item:</Label>
              <Select value={selectedItemCode} onValueChange={setSelectedItemCode}>
                <SelectTrigger className="w-80 h-8 text-xs font-mono">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {s.itemsMaster.map((i) => (
                    <SelectItem key={i.code} value={i.code} className="text-xs">
                      <span className="font-mono font-semibold mr-1">{i.code}</span> · {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      {/* ----------------- REPORT 1: STATUTORY ITEM LEDGER ----------------- */}
      {reportType === "ledger" && (
        <div className="space-y-6">
          {ledgerData && currentItem ? (
            <>
              {/* Ledger Summary Stats */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat
                  label="Opening balance"
                  value={`${num(ledgerData.open.qty)} ${currentItem.uom}`}
                  sub={`@ ${pkr(ledgerData.open.wac)} · Val: ${mil(ledgerData.open.value)}`}
                />
                <Stat
                  label="Receipts this period"
                  value={`+${num(ledgerData.receipts)}`}
                  tone="success"
                  sub={`${ledgerData.grnCount} GRNs posted`}
                />
                <Stat
                  label="Issues this period"
                  value={`-${num(ledgerData.issues)}`}
                  sub="Issued to departments"
                />
                <Stat
                  label="Closing balance"
                  value={`${num(ledgerData.close.qty)} ${currentItem.uom}`}
                  tone="success"
                  sub={`WAC ${pkr(ledgerData.close.wac)} · Val: ${mil(ledgerData.close.value)}`}
                />
              </div>

              {/* Statutory Ledger Table */}
              <Section
                title={`Perpetual inventory stock ledger · ${currentItem.code}`}
                description={`${currentItem.name} · ${currentItem.spec} · Unit: ${currentItem.uom}`}
                flush
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-5">Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Voucher ref</TableHead>
                      <TableHead>Party / Department</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead className="text-right">Receipt (In)</TableHead>
                      <TableHead className="text-right">Issue (Out)</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right pr-5">WAC (PKR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* Opening balance row */}
                    <TableRow className="bg-muted/30 font-medium">
                      <TableCell className="pl-5 text-xs font-mono">{fmtD(range.from)}</TableCell>
                      <TableCell>
                        <Status tone="neutral" icon={null}>Opening balance</Status>
                      </TableCell>
                      <TableCell className="font-mono text-xs">—</TableCell>
                      <TableCell className="text-xs">Gaddafi Central Store</TableCell>
                      <TableCell className="text-xs text-muted-foreground">Brought forward</TableCell>
                      <TableCell className="text-right font-mono text-xs">—</TableCell>
                      <TableCell className="text-right font-mono text-xs">—</TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold tabular">
                        {num(ledgerData.open.qty)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs tabular pr-5">
                        {num(ledgerData.open.wac)}
                      </TableCell>
                    </TableRow>

                    {/* Entries */}
                    {ledgerData.rows.map((row, i) => {
                      const isReceipt = row.qty > 0;
                      return (
                        <TableRow key={i}>
                          <TableCell className="pl-5 text-xs font-mono">{row.date}</TableCell>
                          <TableCell>
                            <Status tone={TYPE_TONE[row.type]} icon={null}>
                              {TYPE_LABEL[row.type]}
                            </Status>
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold text-primary">
                            {row.ref}
                            <div className="text-[10px] text-muted-foreground font-normal">{row.doc}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-medium text-foreground">{row.party}</div>
                            {row.recipient && (
                              <div className="text-[10px] text-muted-foreground">Rec: {row.recipient}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[14rem] truncate">
                            {row.purpose}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular font-medium text-success">
                            {isReceipt ? `+${row.qty}` : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular font-medium text-foreground">
                            {!isReceipt ? Math.abs(row.qty) : "—"}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold tabular">
                            {num(row.balance)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs tabular pr-5">
                            {num(row.wac)}
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {ledgerData.rows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9}>
                          <Empty>No movement transactions in the selected period.</Empty>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Section>
            </>
          ) : (
            <Empty>Select an item to view its statutory stock ledger.</Empty>
          )}
        </div>
      )}

      {/* ----------------- REPORT 2: VENDOR PERFORMANCE ----------------- */}
      {reportType === "vendors" && (
        <Section
          title="Vendor performance & delivery scorecard"
          description="Consolidated vendor execution rating, fulfillment on-time %, quality defects, and debarment status."
          flush
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Vendor name</TableHead>
                <TableHead className="text-right">POs issued</TableHead>
                <TableHead className="text-right">Order value (PKR)</TableHead>
                <TableHead className="text-right">On-time %</TableHead>
                <TableHead className="text-right">Defect rate</TableHead>
                <TableHead className="text-right">Rating</TableHead>
                <TableHead className="pr-5">Eligibility status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.vendors.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="pl-5">
                    <div className="font-semibold text-xs text-foreground">{v.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      NTN: {v.ntn} · {v.category}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular">{v.pos}</TableCell>
                  <TableCell className="text-right font-mono text-xs tabular font-semibold">
                    {pkr(v.value)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular font-semibold">
                    <span className={v.onTime < 80 ? "text-destructive" : "text-success"}>
                      {v.onTime}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular">
                    <span className={v.defects > 2 ? "text-destructive font-semibold" : "text-muted-foreground"}>
                      {v.defects}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular font-bold text-primary">
                    {v.rating.toFixed(1)} / 5.0
                  </TableCell>
                  <TableCell className="pr-5">
                    {v.status === "Blacklisted" ? (
                      <Status tone="danger">Debarred to {v.until}</Status>
                    ) : v.status === "Blacklisting proposed" ? (
                      <Status tone="warning">Blacklisting proposed</Status>
                    ) : (
                      <Status tone="success">Eligible</Status>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {/* ----------------- REPORT 3: PROCUREMENT SUMMARY ----------------- */}
      {reportType === "procurement" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Section
              title="Spend by department"
              description="Committed procurement expenditure across organizational wings, FY 2026-27."
            >
              <BarList
                rows={s.spendByDept.map((d) => ({
                  name: d.name,
                  value: d.value / 1e6,
                  color: "var(--chart-1)",
                  hint: `${d.name}: ${pkr(d.value)}`,
                }))}
                format={(v) => `PKR ${v.toFixed(1)}M`}
              />
            </Section>

            <Section
              title="Spend by category"
              description="Expenditure breakdown across sports goods, infrastructure, turf machinery, etc."
            >
              <BarList
                rows={s.spendByCategory.map((c) => ({
                  name: c.name,
                  value: c.value / 1e6,
                  color: "var(--chart-2)",
                  hint: `${c.name}: ${pkr(c.value)}`,
                }))}
                format={(v) => `PKR ${v.toFixed(1)}M`}
              />
            </Section>
          </div>

          <Section
            title="Procurement tenders history & efficiency"
            description="Tenders concluded, competitive savings achieved, and average turnaround days."
            flush
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Tender ref</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Value (PKR)</TableHead>
                  <TableHead className="text-right">Bidders</TableHead>
                  <TableHead className="text-right">Cycle days</TableHead>
                  <TableHead className="pr-5">Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.tenderHistory.map((t) => (
                  <TableRow key={t.ref}>
                    <TableCell className="pl-5 font-mono text-xs font-semibold text-primary">{t.ref}</TableCell>
                    <TableCell className="text-xs font-medium">{t.title}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.method}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular font-semibold">
                      {pkr(t.value)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs tabular">{t.bidders}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular">{t.days}d</TableCell>
                    <TableCell className="pr-5">
                      <Status tone="success">{t.stage}</Status>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </div>
      )}

      {/* ----------------- REPORT 4: INVENTORY POSITION ----------------- */}
      {reportType === "inventory" && (
        <div className="space-y-6">
          <Section
            title="Stadium stores inventory valuation"
            description="Perpetual valuation across all stadium storehouses under common PCB chart of accounts."
            flush
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Store name</TableHead>
                  <TableHead>City / Stadium</TableHead>
                  <TableHead>Store type</TableHead>
                  <TableHead>Storekeeper / Custodian</TableHead>
                  <TableHead className="text-right">Total SKUs</TableHead>
                  <TableHead className="text-right pr-5">Valuation (PKR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.stadiumStores.map((st) => (
                  <TableRow key={st.id}>
                    <TableCell className="pl-5 font-semibold text-xs text-foreground">{st.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{st.city}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline">{st.type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{st.custodian}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular">{st.totalSkus}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold tabular text-primary pr-5">
                      {pkr(st.valuationPkr)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>

          {/* Slow-moving & Dead Stock Section */}
          <Section
            title="Non-moving & dead stock monitoring"
            description="Items with zero issuance movement exceeding 120 days. Earmarked for disposal or inter-stadium transfer."
            flush
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Item code</TableHead>
                  <TableHead>Item description</TableHead>
                  <TableHead>Storehouse</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Valuation (PKR)</TableHead>
                  <TableHead className="text-right">Last movement</TableHead>
                  <TableHead className="pr-5">Days stagnant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.deadStock.map((d) => (
                  <TableRow key={d.code}>
                    <TableCell className="pl-5 font-mono text-xs font-semibold">{d.code}</TableCell>
                    <TableCell className="text-xs font-medium">{d.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.store}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular">{d.qty}</TableCell>
                    <TableCell className="text-right font-mono text-xs tabular font-semibold text-warning">
                      {pkr(d.value)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-muted-foreground">{d.lastMovement}</TableCell>
                    <TableCell className="pr-5">
                      <Status tone="warning" icon={AlertTriangle}>{d.days} days</Status>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Section>
        </div>
      )}

      {/* ----------------- REPORT 5: ACTIVITY & AUDIT LOG ----------------- */}
      {reportType === "activity" && (
        <Section
          title="Tamper-evident system activity log"
          description="Cryptographically sequenced event trail for procurement operations, financial releases, and role transitions."
          flush
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Timestamp</TableHead>
                <TableHead>User & Role</TableHead>
                <TableHead>Module / Badge</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="pr-5">Audit details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.recentActivities.map((act) => (
                <TableRow key={act.id}>
                  <TableCell className="pl-5 font-mono text-xs whitespace-nowrap text-muted-foreground">
                    {act.time}
                  </TableCell>
                  <TableCell className="text-xs">
                    <span className="font-semibold text-foreground">{act.user ?? "System"}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] font-mono">{act.badge}</Badge>
                  </TableCell>
                  <TableCell className="text-xs font-medium text-foreground">
                    {act.title}
                    <div className="text-[11px] text-muted-foreground font-normal">{act.desc}</div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground pr-5 max-w-sm truncate">
                    {act.details}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {/* ----------------- SCHEDULED DELIVERIES TABLE (ALL TABS) ----------------- */}
      <div className="mt-8">
        <Section
          title="Scheduled report dispatches"
          description="Reports scheduled for automatic execution and email delivery in PDF and Excel format."
          flush
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Report name</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Export format</TableHead>
                <TableHead className="pr-5">Next scheduled run</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {s.scheduled.map((sch, i) => (
                <TableRow key={i}>
                  <TableCell className="pl-5 font-semibold text-xs text-foreground">{sch.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">{sch.freq}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{sch.to}</TableCell>
                  <TableCell className="text-xs">{sch.fmt}</TableCell>
                  <TableCell className="pr-5 font-mono text-xs text-primary">{sch.next}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      </div>

      {/* ----------------- MODAL: SCHEDULE REPORT ----------------- */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-primary" /> Schedule automated delivery
            </DialogTitle>
            <DialogDescription>
              Configure automated compilation and email dispatch of statutory reports.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="sch-name">Report title</Label>
              <Input
                id="sch-name"
                value={schedName}
                onChange={(e) => setSchedName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Frequency</Label>
              <Select value={schedFreq} onValueChange={setSchedFreq}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Weekly">Weekly (Every Monday 07:00)</SelectItem>
                  <SelectItem value="Monthly">Monthly (1st of month 07:00)</SelectItem>
                  <SelectItem value="Quarterly">Quarterly (Start of quarter)</SelectItem>
                  <SelectItem value="Annual">Annual (01-July fiscal start)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="sch-to">Recipient email addresses (comma separated)</Label>
              <Input
                id="sch-to"
                value={schedTo}
                onChange={(e) => setSchedTo(e.target.value)}
                placeholder="cfo@pcb.com.pk, audit@pcb.com.pk"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Delivery format</Label>
              <Select value={schedFmt} onValueChange={setSchedFmt}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF">PDF (Board Document)</SelectItem>
                  <SelectItem value="Excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="PDF + Excel">PDF + Excel bundle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule}>Save scheduled delivery</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
