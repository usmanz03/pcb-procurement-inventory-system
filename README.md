# PCB Procurement & Inventory Management System — POC

Clickable proof of concept for a PPRA-compliant procurement, inventory, custody and asset-lifecycle platform. Covers all twelve SOW modules (Item Master through Reports) with role-based views, live charts and end-to-end flows.

**Live demo:** https://usmanz03.github.io/pcb-procurement-inventory-system/

All figures and records are illustrative sample data.

## Run

```bash
python3 serve.py
```

Then open http://localhost:3000. Keys `1`–`9` jump between screens; `⌘K` opens search.

## Demo path

1. **Sourcing & Evaluation** → *Generate purchase order*: blocked by PPRA gates.
2. **Approvals** → approve APR-2026-0186 as Director, switch role to CFO and approve, record the Chairman sign-off.
3. Skip the standstill window, then generate and release the PO.
4. **PO & Goods Receipt** → post a GRN; stock and weighted average cost update.
5. **Reports** → item ledger shows the movement; export to Excel or PDF.

## Structure

| Path | Purpose |
|---|---|
| `index.html` | App shell and screen markup |
| `css/shadcn.css` | Theme tokens (dark/light) and base components |
| `css/poc.css` | Charts, motion and dashboard components |
| `js/data.js`, `js/poc-data.js` | Sample dataset |
| `js/charts.js` | SVG charts (line, bars, sparkline, gauges) |
| `js/app.js` | Router, theme, dialogs |
| `js/poc-core.js` | Roles, overview, approvals, PO/GRN, finance |
| `js/poc-screens.js` | Reports, sourcing, inventory, custody, item master, search |
