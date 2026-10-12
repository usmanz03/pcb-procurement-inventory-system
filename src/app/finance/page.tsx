"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Banknote, Check, Code2, FileCheck2, Receipt, ShoppingCart, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KpiGrid, PageHeader, Section, SingleBars, Status } from "@/components/dash";
import { useApp, useRole } from "@/lib/store";
import { num, pkr } from "@/lib/domain";
import type { Invoice } from "@/lib/types";

export default function FinancePage() {
  const s = useApp();
  const role = useRole();
  const [exc, setExc] = useState<Invoice | null>(null);
  const [erp, setErp] = useState(false);
  const r = s.reconciliationRecord;
  const inv9812 = s.invoices.find((i) => i.inv === "INV-SIG-2026-9812");
  const paid = inv9812?.status === "Paid";
  const exceptions = s.invoices.filter((i) => i.match === "Exception");
  const A = s.analytics.ageingBuckets;

  const release = (inv: string) => {
    const res = s.releasePayment(inv);
    if (res.ok) toast.success(res.title, { description: res.message }); else toast.error(res.title, { description: res.message });
  };

  return (
    <>
      <PageHeader module="Module 10" title="Three-way match & payment" description="Purchase order, goods receipt and vendor invoice matched within tolerance, with tax withholding and payment tracking."
        actions={<>
          <Button variant="outline" onClick={() => setErp(true)}><Code2 /> ERP data contract</Button>
          {!role.readOnly && <Button disabled={paid} onClick={() => release("INV-SIG-2026-9812")}><Banknote /> {paid ? "Payment released" : "Release payment"}</Button>}
        </>} />

      <KpiGrid items={[
        { label: "Matched within tolerance", value: 98.4, decimals: 1, suffix: "%", icon: FileCheck2, hero: true, foot: "FY to date, by value" },
        { label: "Exceptions open", value: exceptions.filter((i) => i.status !== "Credit note requested").length, icon: AlertTriangle, delta: exceptions.length ? { dir: "up", text: "Outside 1% tolerance", good: false } : { dir: "flat", text: "None" } },
        { label: "Payables outstanding", prefix: "PKR", value: A.values.reduce((a: number, b: number) => a + b, 0), decimals: 1, suffix: "M", icon: Receipt, foot: "Across all vendors" },
        { label: "Paid this month", value: s.invoices.filter((i) => i.status === "Paid").length, icon: Banknote, foot: "RTGS transfers" },
      ]} />

      <Section className="mb-6" title={`Reconciliation · ${r.po.number} · Signify Pakistan Ltd`} description={r.po.item}
        action={paid ? <Status tone="success">Paid · {inv9812?.paidRef}</Status> : <Status tone="success">Zero-variance match</Status>}>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { icon: ShoppingCart, t: "Purchase order", v: r.po.baseTotal, sub: `${r.po.number} · ${r.po.qty} units ordered` },
            { icon: Truck, t: "Goods receipt", v: r.grn.qtyAccepted * r.po.unitPrice, sub: `${r.grn.number} · ${r.grn.qtyAccepted}/${r.grn.qtyDelivered} passed inspection` },
            { icon: Receipt, t: "Vendor tax invoice", v: r.invoice.billedBase, sub: `${r.invoice.number} · 0.00% variance` },
          ].map((x) => (
            <div key={x.t} className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><x.icon className="size-3.5" />{x.t}</div>
              <div className="mt-2 font-mono text-xl font-semibold tabular">{pkr(x.v)}</div>
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Check className="size-3 text-success" />{x.sub}</div>
            </div>
          ))}
        </div>
        <Table className="mt-5">
          <TableHeader><TableRow><TableHead>Voucher component</TableHead><TableHead>Basis</TableHead><TableHead>Rate</TableHead><TableHead className="text-right">Amount (PKR)</TableHead></TableRow></TableHeader>
          <TableBody className="text-[13px]">
            <TableRow><TableCell>Base taxable supply</TableCell><TableCell className="text-muted-foreground">Approved PO price</TableCell><TableCell>—</TableCell><TableCell className="text-right font-mono tabular">{num(r.taxes.base)}</TableCell></TableRow>
            <TableRow><TableCell>Sales tax</TableCell><TableCell className="text-muted-foreground">Sales Tax Act 1990</TableCell><TableCell>+18.0%</TableCell><TableCell className="text-right font-mono tabular">+{num(r.taxes.salesTax18)}</TableCell></TableRow>
            <TableRow><TableCell>Gross invoice value</TableCell><TableCell className="text-muted-foreground">Before withholding</TableCell><TableCell>—</TableCell><TableCell className="text-right font-mono tabular">{num(r.taxes.gross)}</TableCell></TableRow>
            <TableRow><TableCell>Income tax withheld</TableCell><TableCell className="text-muted-foreground">ITO 2001 s.153, active taxpayer</TableCell><TableCell>−4.5%</TableCell><TableCell className="text-right font-mono text-destructive tabular">−{num(r.taxes.wht4_5)}</TableCell></TableRow>
            <TableRow className="bg-muted/40 font-semibold"><TableCell>Net payable to vendor</TableCell><TableCell className="font-normal text-muted-foreground">RTGS transfer</TableCell><TableCell>—</TableCell><TableCell className="text-right font-mono text-primary tabular">{num(r.taxes.netPayable)}</TableCell></TableRow>
          </TableBody>
        </Table>
      </Section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Section title="Match queue & payment status" description="Every GRN arrives here automatically. Exceptions are routed back before payment." flush className="self-start">
          <Table>
            <TableHeader><TableRow><TableHead className="pl-5">Invoice</TableHead><TableHead>PO / GRN</TableHead><TableHead className="text-right">Base (PKR)</TableHead><TableHead>Match</TableHead><TableHead>Payment</TableHead><TableHead className="pr-5" /></TableRow></TableHeader>
            <TableBody>
              {s.invoices.map((i, k) => (
                <TableRow key={i.inv + k}>
                  <TableCell className="pl-5"><div className="font-mono text-xs font-semibold">{i.inv}</div><div className="text-xs text-muted-foreground">{i.vendor}</div></TableCell>
                  <TableCell className="font-mono text-[11px]"><div>{i.po}</div><div className="text-muted-foreground">{i.grn}</div></TableCell>
                  <TableCell className="text-right font-mono text-xs tabular">{num(i.base)}</TableCell>
                  <TableCell>{i.match === "Matched" ? <Status tone="success">Matched</Status> : i.match === "Exception" ? <Status tone="danger" icon={AlertTriangle}>Outside tolerance</Status> : <Status tone="neutral">Awaiting invoice</Status>}</TableCell>
                  <TableCell>{i.status === "Paid" ? <><Status tone="success">Paid</Status><div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{i.paidRef}</div></> : <Status tone={i.status === "Approved for payment" ? "info" : "neutral"}>{i.status}</Status>}</TableCell>
                  <TableCell className="pr-5 text-right">
                    {i.match === "Exception" && i.status !== "Credit note requested" && <Button size="sm" variant="outline" onClick={() => setExc(i)}>Review</Button>}
                    {i.status === "Approved for payment" && !role.readOnly && <Button size="sm" onClick={() => release(i.inv)}>Pay</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
        <Section title="Payables ageing" description="Outstanding vendor payables by age, PKR millions." className="self-start">
          <SingleBars data={A.labels.map((l: string, i: number) => ({ bucket: l, value: A.values[i] }))} xKey="bucket" yKey="value" label="Payables" color="var(--chart-2)" valueFormat={(v) => `PKR ${v.toFixed(1)}M`} height={230} />
        </Section>
      </div>

      <Dialog open={!!exc} onOpenChange={(o) => !o && setExc(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Three-way match exception · {exc?.inv}</DialogTitle><DialogDescription>{exc?.exception?.note}</DialogDescription></DialogHeader>
          {exc?.exception && (
            <Table>
              <TableHeader><TableRow><TableHead /><TableHead className="text-right">Purchase order</TableHead><TableHead className="text-right">Goods receipt</TableHead><TableHead className="text-right">Invoice</TableHead></TableRow></TableHeader>
              <TableBody className="font-mono text-xs tabular">
                <TableRow><TableCell className="font-sans">Quantity (boxes)</TableCell><TableCell className="text-right">{exc.exception.poQty}</TableCell><TableCell className="text-right">{exc.exception.grnQty}</TableCell><TableCell className="text-right font-semibold text-destructive">{exc.exception.invQty}</TableCell></TableRow>
                <TableRow><TableCell className="font-sans">Unit rate (PKR)</TableCell><TableCell className="text-right">{num(exc.exception.poRate)}</TableCell><TableCell className="text-right">{num(exc.exception.poRate)}</TableCell><TableCell className="text-right font-semibold text-destructive">{num(exc.exception.invRate)}</TableCell></TableRow>
                <TableRow><TableCell className="font-sans">Amount (PKR)</TableCell><TableCell className="text-right">{num(exc.exception.poQty * exc.exception.poRate)}</TableCell><TableCell className="text-right">{num(exc.exception.grnQty * exc.exception.poRate)}</TableCell><TableCell className="text-right font-semibold text-destructive">{num(exc.exception.invQty * exc.exception.invRate)}</TableCell></TableRow>
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground">Payment is capped at the matched value until the vendor issues a credit note or the variance is approved.</p>
          {!role.readOnly && (
            <DialogFooter>
              <Button variant="outline" onClick={() => { s.resolveException(exc!.inv, "credit"); toast("Credit note requested from vendor"); setExc(null); }}>Request credit note</Button>
              <Button onClick={() => { s.resolveException(exc!.inv, "cap"); toast.success("Approved at matched value"); setExc(null); }}>Pay matched amount only</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={erp} onOpenChange={setErp}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>ERP data contract · POST /finance/handoff</DialogTitle><DialogDescription>Sent to PCB&apos;s finance system at each GRN. Payment status comes back on the same contract.</DialogDescription></DialogHeader>
          <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs text-primary">{JSON.stringify({ transaction_id: "TXN-PCB-FIN-2026-9812", match_status: "RECONCILED_THREE_WAY_MATCH", po_number: r.po.number, grn_number: r.grn.number, invoice_number: r.invoice.number, item_code: "PCB-INF-LGT-0018", budget_head: "BH-CAP-INF", classification: "CapEx", base_amount_pkr: r.taxes.base, sales_tax_pkr: r.taxes.salesTax18, wht_pkr: r.taxes.wht4_5, net_payable_pkr: r.taxes.netPayable, tolerance_variance: 0 }, null, 2)}</pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
