import { fail } from "@/lib/server/http";
import { snapshot } from "@/lib/server/runtime";

/* GET /api/finance/handoff — ERP data contract: one record per GRN passed to Finance (FR-10.3, FR-10.4) */
export async function GET() {
  try {
    const { state: s, version } = await snapshot();
    const records = s.invoices.map((i) => {
      const po = s.purchaseOrders.find((p) => p.po === i.po);
      const head = s.budgetHeads.find((b) => b.id === po?.budgetHead);
      const base = i.base;
      return {
        transaction_id: `TXN-${i.grn}`,
        match_status: i.match === "Matched" ? "RECONCILED_THREE_WAY_MATCH" : i.match === "Exception" ? "EXCEPTION_OUTSIDE_TOLERANCE" : "AWAITING_INVOICE",
        payment_status: i.status,
        po_number: i.po, grn_number: i.grn, invoice_number: i.match === "Awaiting invoice" ? null : i.inv,
        vendor: i.vendor, vendor_id: po?.vendorId ?? null, item_code: po?.itemCode ?? null,
        budget_head: po?.budgetHead ?? null, classification: head?.type ?? null,
        base_amount_pkr: base, sales_tax_pkr: Math.round(base * 0.18), wht_pkr: Math.round(base * 0.045),
        net_payable_pkr: Math.round(base * 1.18 - base * 0.045), payment_reference: i.paidRef ?? null,
      };
    });
    return Response.json({ contract: "pcb.finance.handoff/v1", generated_at: new Date().toISOString(), state_version: version, count: records.length, records });
  } catch (e) {
    return fail(e);
  }
}
