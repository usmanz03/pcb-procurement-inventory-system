"use client";

import Link from "next/link";
import { BarChart3 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Stat, Status, type Tone } from "@/components/dash";
import { ledgerFor, useApp } from "@/lib/store";
import { FAR_FUTURE, FY_START, pkr } from "@/lib/domain";
import type { LedgerType } from "@/lib/types";

export const TYPE_LABEL: Record<LedgerType, string> = { OPEN: "Opening", GRN: "Receipt (GRN)", ISSUE: "Issue", TRANSFER_OUT: "Transfer out", TRANSFER_IN: "Transfer in", RETURN: "Return", ADJUST: "Adjustment" };
export const TYPE_TONE: Record<LedgerType, Tone> = { OPEN: "neutral", GRN: "success", ISSUE: "neutral", TRANSFER_OUT: "info", TRANSFER_IN: "info", RETURN: "neutral", ADJUST: "warning" };

export function ItemSheet({ code, onOpenChange }: { code: string | null; onOpenChange: (o: boolean) => void }) {
  const s = useApp();
  const item = s.itemsMaster.find((i) => i.code === code);
  const L = code ? ledgerFor(s, code, FY_START, FAR_FUTURE) : null;
  const last = L?.last;
  const asset = code ? s.assetAttributes[code] : undefined;
  return (
    <Sheet open={!!item} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {item && (
          <>
            <SheetHeader>
              <SheetDescription className="font-mono text-xs">{item.code}</SheetDescription>
              <SheetTitle className="text-lg leading-snug">{item.name}</SheetTitle>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Status tone="neutral" icon={null}>{item.budgetType}</Status>
                <Status tone="neutral" icon={null}>{item.classification.includes("Asset") ? "Asset" : "Consumable"}</Status>
                <Status tone="neutral" icon={null}>{item.uom}</Status>
                {item.totalStock <= item.reorderLevel && <Status tone="warning">At re-order level</Status>}
              </div>
            </SheetHeader>
            <div className="grid gap-5 px-4 pb-6">
              <div className="grid grid-cols-2 gap-3">
                <Stat label="Last purchase" value={last ? pkr(last.unitCost ?? 0) : "—"} sub={last ? `${last.date} · ${last.party}` : "No receipts this FY"} />
                <Stat label="Weighted average" value={pkr(L?.close.wac ?? item.avgCostPkr)} sub="Updated on every GRN" />
              </div>
              {asset && (
                <div className="rounded-lg border p-3 text-[13px]">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Asset attributes</div>
                  Warranty {asset.warranty} · useful life {asset.usefulLife} · {asset.depreciation}
                </div>
              )}
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock by store</div>
                <div className="grid grid-cols-5 gap-2">
                  {s.stadiumStores.map((st) => (
                    <div key={st.id} className="rounded-lg border bg-muted/30 p-2">
                      <div className="truncate text-[10px] text-muted-foreground">{st.city === "Lahore" && st.id !== "STORE-LHR-01" ? "NCA" : st.city}</div>
                      <div className="font-mono text-base font-semibold tabular">{item.storeBreakdown[st.id] ?? 0}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Recent movements · Gaddafi Central</div>
                <Table>
                  <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Party</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Bal.</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(L?.rows ?? []).slice(-6).reverse().map((e) => (
                      <TableRow key={e.ref + e.date}>
                        <TableCell className="text-xs">{e.date}</TableCell>
                        <TableCell><Status tone={TYPE_TONE[e.type]} icon={null}>{TYPE_LABEL[e.type]}</Status></TableCell>
                        <TableCell className="max-w-[9rem] truncate text-xs">{e.party}</TableCell>
                        <TableCell className={`text-right font-mono text-xs tabular ${e.qty > 0 ? "text-success" : ""}`}>{e.qty > 0 ? "+" : ""}{e.qty}</TableCell>
                        <TableCell className="text-right font-mono text-xs font-semibold tabular">{e.balance}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button variant="outline" asChild className="justify-self-start"><Link href={`/reports/?item=${item.code}`}><BarChart3 /> Full item ledger</Link></Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
