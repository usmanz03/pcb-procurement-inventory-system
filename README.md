# PCB Procurement & Inventory Management System

An enterprise-grade procurement, stores, custody, and asset-lifecycle platform built for the Pakistan Cricket Board (PCB), strictly adhering to PPRA Rules 2004 and FY 2026–27 governance standards.

**Live Production URL:** [https://pcb-procurement.vercel.app](https://pcb-procurement.vercel.app)

---

## Key Capabilities

- **Strict PPRA & Delegation of Financial Powers Compliance:** Automated multi-tier approval chains, statutory standstill tracking, and segregated duties.
- **Three-Way Matching:** Seamless verification across Purchase Orders, Goods Receipt Notes (GRN), and Vendor Invoices within a 1% tolerance window.
- **Complete Asset Lifecycle & Custody:** Digital custody issuance to staff, returnable equipment tracking, and Survey Committee disposal workflows.
- **Physical QR Traceability:** Instant item provenance and chain-of-custody verification accessible on any device via scannable QR labels.
- **Permanent Tamper-Evident Records:** Append-only stock ledger and cryptographic activity log verifying the integrity of every action.

---

## Seeded Accounts

All accounts share the initial demonstration password: **`Pcb@2026`**

| Role | Name | Email | Permissions / Scope |
|---|---|---|---|
| **Director** | Usman Zafar | `usman.zafar@pcb.com.pk` | Full administrative visibility, demand approvals, PO release authority |
| **Procurement Committee** | Farhan Ali | `farhan.ali@pcb.com.pk` | Comparative statements, bid evaluations, tender grievance reviews |
| **CFO** | Tariq Mehmood | `tariq.mehmood@pcb.com.pk` | High-value approvals (> PKR 3M), budget sanctions, three-way match payments |
| **Storekeeper** | Muhammad Rashid | `muhammad.rashid@pcb.com.pk` | Central stores, goods receipt (GRN), item issuance, custody assignments |
| **Auditor** | AGP Audit Team | `audit@agp.gov.pk` | Read-only inspection of all ledgers, registers, and compliance logs |

*Self-registration with role selection and department assignment is also available directly on the sign-in screen.*

---

## Running Locally

### Prerequisites
- Node.js 20+
- npm or pnpm

### Quick Start
```bash
git clone https://github.com/usmanz03/pcb-procurement-inventory-system.git
cd pcb-procurement-inventory-system

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Suggested Demonstration Flow

1. **Sign In as Director:** Select Usman Zafar from the team picker on the login page.
2. **Raise a Demand:** Under *Demand & inventory*, create an item request to observe automatic stock checks and procurement routing.
3. **Approval Chain:** In *Approvals*, approve request APR-2026-0186 as Director, switch user to CFO (Tariq Mehmood) to approve the financial threshold, record the Chairman's sign-off, and conclude the standstill window.
4. **PO & Receiving:** Generate the purchase order and post the Goods Receipt Note (GRN) upon physical delivery.
5. **Three-Way Match & Payment:** In *Finance*, capture the vendor invoice, run automated matching, and release payment.
6. **Track an Item (`/trace/`):** Scan or open an asset's QR label to view its complete journey from initial indent to active deployment.
7. **Controls & Audit (`/system/`):** Run the integrity verification check and execute the tamper simulation to demonstrate the system's strict refusal of unauthorised modifications.
8. **Our Commitment (`/commitment/`):** Review delivery timelines, enterprise milestones, and service levels.

---

## Demonstration Reset

To restore the system back to its clean baseline before or after a presentation, send an authorised reset request:

```bash
curl -X POST http://localhost:3000/api/reset/ -H "x-pcb-role: director"
```
*(User accounts are preserved across resets).*
