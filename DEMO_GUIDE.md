# PCB Procurement & Stores: Demo Guide

How every module works, what to show, and how to present it to PCB's procurement, stores and finance leadership.

**Live system:** https://pcb-procurement.vercel.app
**Password for every demo person:** `Pcb@2026`

| Person | Email | Role | Use them for |
|---|---|---|---|
| Usman Zafar | usman.zafar@pcb.com.pk | Director Procurement | Approvals, retiring codes, approving stock counts. Sees everything |
| Engr. Farhan Ali | farhan.ali@pcb.com.pk | Procurement Committee | Bid evaluation, committee remarks, grievances |
| Tariq Mehmood | tariq.mehmood@pcb.com.pk | Chief Financial Officer | Approvals above PKR 3M, invoices, payments |
| Muhammad Rashid | muhammad.rashid@pcb.com.pk | Central Storekeeper | Item codes, demands, issues, stores, counts, goods receipt |
| DG Audit Office | audit@agp.gov.pk | Statutory Auditor | View-only. Proves nobody outside a role can change anything |

You don't need to type emails. On the sign-in screen, open **Sign in as**, pick the person, and press **Sign in**. To change person mid-demo, click the name at the bottom of the sidebar and choose **Switch user**.

---

## 1. Before you walk in (10 minutes)

1. **Open the live link** a few minutes before the meeting and sign in as the Director, so the system is warm.
2. **Reset the demo data:** click the name at the bottom-left, then **Reset demo data**. Everything returns to the starting position this guide assumes.
3. **Present from one laptop.** The online demo keeps its data on the server that served you. If the site sits idle for a long time it can return to the starting position, so reset right before you begin and keep going.
4. **Have a phone ready** with the camera app, for the QR moment in Act 5.
5. **Theme:** the sun/moon button (top right) switches light and dark. Light reads better on most projectors.
6. **Zoom:** set the browser to 90% on a 1366-wide projector so tables fit.

---

## 2. The story in one breath

> "Today PCB tracks demand, stores, tenders and payments on paper and in separate spreadsheets. This is one system where every item has one code from the day it is catalogued to the day it is disposed of. Every request is checked against stock and budget automatically, every approval follows PCB's financial powers, nobody can approve their own request, and every action is recorded permanently and cannot be altered. It is built around the PPRA rules, owned by PCB, and live in two and a half months."

Say this while the **Dashboard** is on screen, then go straight into the demo. Show, don't describe.

---

## 3. The demo script (about 25 minutes)

Each step lists **who to be**, **what to click**, and **what to say**. The *wow* lines mark the moments to slow down for.

### Act 1: The Item master (Module 0), 4 minutes

*Point to make: one clean catalogue, no duplicates, nothing enters without approval.*

1. **Be:** Muhammad Rashid (Storekeeper). **Open:** Item master.
2. Show the catalogue. Point at an item like the Kookaburra balls: *"Each item has one permanent code. Under it you can see its old codes from the legacy system, so history migrates cleanly."*
3. Click the ball row to open the **item record**:
   - **Overview:** stock in every store, how much is free and how much is reserved, re-order level, average cost.
   - **Cost history:** every purchase with vendor and price, plus a chart of purchase price against average cost. *"The average cost updates automatically on every delivery. No manual calculation."*
   - **Movements:** every receipt, issue, return and adjustment.
4. Close it and click **New item code**:
   - **Classify:** Sports Equipment → Balls → Consumable → OpEx. *Wow: the next free code is generated for you, e.g. `PCB-SPO-BALL-0043`.*
   - **Describe:** keep the pink-ball example.
   - **Check & submit:** *Wow: the duplicate check flags the existing white balls as similar. "The system stops the same item being catalogued twice under two codes, which is the most common source of stock errors."*
   - Press **Send for approval**. *"Nothing can be bought or stored under this code until the Director approves it."*
5. *(Optional)* Row menu (⋯) on an item → **Retire this code**. The system refuses because stock is still on hand. *"You cannot lose stock by retiring a code."*

### Act 2: Approve, then raise a demand (Module 1), 6 minutes

*Point to make: a request is checked against stock and budget instantly, stock is reserved, and the shortfall goes to Procurement automatically.*

1. **Switch user → Usman Zafar (Director).** The sidebar badge on **Approvals** shows the waiting count.
2. **Open:** Approvals. Select the new **Item Code Request** for the pink balls and press **Approve**. *"The code is now live in the catalogue."* Optionally open Item master to show it.
3. While in Approvals, open **REQ-2026-1051 (rain covers)**, which the Director raised himself. *Wow: the system will not let him approve it. "Segregation of duties: nobody approves their own request."* Press **Route to CFO**.
4. **Switch user → Muhammad Rashid.** **Open:** Demands → **Raise a demand**.
   - Item: Kookaburra white match balls. Quantity: **50**. Department: High Performance Centre.
   - *Wow: watch the live stock check.* 40 are in the central store, so **40 are reserved** (gold) and **10 go to Procurement** (orange) as a requisition of about PKR 1.8M. The budget check passes and shows what is left on the budget head.
   - *"In one step the system checked stock, held the 40 so nobody else can promise them, and raised a purchase request for the balance under the same demand number."*
   - Press **Submit demand**. The demand opens with its history.
5. Back on Demands, show the **Ready to issue** card. Press **Issue 40**. *"The storekeeper hands it over, the stock ledger updates, and the reservation is released, all in one click."*
6. Show the **Combined requirement** panel: *"Procurement sees every department's shortfall for the same item added together, so PCB buys once at a better price."*
7. *(Optional)* Raise a demand for **500** balls. *Wow: the system refuses because the budget head cannot cover it.*

### Act 3: Stores & stock (Module 2), 5 minutes

*Point to make: every store on one ledger, nothing moves without a record, and physical counts reconcile to the books.*

1. **Still Muhammad Rashid.** **Open:** Stores & stock.
2. The five stores appear as cards. Click one to filter the **Stock position**. *"Gaddafi, Karachi, Pindi, Multan and the NCA, one database, one truth."*
3. **Add store:** e.g. "Iqbal Stadium Sub-store", Faisalabad. *"A new venue is live in seconds. No IT project."*
4. **Transfer stock** from Gaddafi to the new store. Point out the note that **reserved stock cannot be moved**.
5. **Movement history** tab: every receipt, issue, transfer, return and count adjustment, with document numbers and who received it. Filter by Issue or by item.
6. **Asset tags** tab: every tagged asset, who holds it, and its QR label.
7. **Stock-takes** tab: open **ST-2026-Q2-LHR** (awaiting approval).
   - *"The counter only ever sees a blank sheet. They cannot see what the books say, so the count is honest."*
   - Switch to **Usman Zafar** and **Approve and post**. *Wow: the variance (one match kit short, about PKR 321,875) is posted as its own ledger entry. Nothing is overwritten.*
   - To show a fresh count: **Start count** on any store, enter quantities, **Submit**. The person who counted cannot approve it.

### Act 4: The rest of the lifecycle at a glance, 5 minutes

Keep this brisk. The audience should feel the whole chain exists.

1. **Sourcing & evaluation** (Director): the PPRA method selector (type a value and the correct method, advertisement rule and approval band appear), sealed two-envelope evaluation, and the bid evaluation report.
2. **RFQ tab:** send the RFQ to three vendors, record three quotations, open the comparative statement, then **Approve and generate purchase order**. *Wow: the PO is created from the approved comparison with no re-typing.*
3. **PO & goods receipt** (Storekeeper): open the new PO, **Post GRN**. Stock and average cost update and asset tags are created.
4. **Three-way match** (CFO): **Capture invoice** on the new receipt. If the price matches the PO, it is approved for payment; change the rate by more than 1% and the system routes it back. Then **Pay**.
5. *(Optional, the flagship)* **Tender 089 floodlights:** Approvals → APR-2026-0186 approve as Director, then CFO, then record the Chairman's sign-off. In the Intention to Award card, press **Fast-forward to end of window**. PO & goods receipt → **Generate PO**. *Wow: the PO stays locked until every PPRA condition is green.*

### Act 5: Trust (the closing argument), 4 minutes

1. **Track an item:** choose the floodlight. *Wow: its whole story from catalogue to tender to order to receipt to the person holding it, on one screen.*
   - Press **Label** and scan the QR with your phone. *Wow: the phone opens the same live trace, with no app and no login.*
2. **Controls & audit:**
   - *"Has anything been altered?"* Green: every record checked.
   - **Try to change history → Attempt the changes.** *Wow: three attempts to rewrite history are refused by the system, even for an administrator.*
   - **Your requirements, delivered:** *"72 of PCB's 79 Scope-of-Work requirements are working in this system today. The rest are in the agreed delivery plan."*
   - **Activity record:** click any line to see exactly what changed, from what, to what, by whom.
3. **Sign in as the Auditor** to show everything can be viewed and nothing can be changed.
4. **Finish on Our commitment.** Read the headline numbers aloud: *2.5 months, PKR 3.4M fixed, 90-day free warranty, 1-hour critical response.* End with *"PCB owns it, the source code is handed over, and payment is only on PCB's sign-off of each phase."*

---

## 4. How every module works (reference)

### Module 0: Item master & codification (Item master)

| Action | Who | What happens |
|---|---|---|
| **New item code** | Storekeeper, Director | Three steps: classify (category, sub-category, consumable/asset, CapEx/OpEx), describe (description, specification, unit, re-order level; asset warranty, life and depreciation), check & submit. The code `PCB-<CAT>-<SUB>-<serial>` is generated. Exact duplicates are blocked and similar items are flagged. Goes to the Director. |
| **Approve code** | Director (Approvals) | The item is created as Active, with an empty stock record in every store, ready for demands and orders. |
| **View record** | Everyone | Overview, cost history (each receipt with vendor and price, chart of price vs average cost), movements. |
| **Edit details** | Storekeeper, Director | Description, specification, unit, re-order level, shelf life. Category, nature and CapEx/OpEx are fixed by the code. Old values are kept in the activity record. |
| **Map an old code** | Storekeeper, Director | Links a legacy code to the new Item Code. One old code can map to only one item. |
| **Retire code** | Storekeeper, Director | Blocked if stock is on hand or open demands use it. Otherwise it goes to the Director; once approved the code is Inactive and never reused. |
| **Reactivate** | Director | Brings a retired code back. |
| **Print label** | Everyone | Scannable QR that opens the item's live trace. |

### Module 1: Purchase requisition / demand (Demands)

| Action | Who | What happens |
|---|---|---|
| **Raise a demand** | Anyone with stores access | Item, department, quantity, needed-by date, budget head, purpose. A live stock check shows what is free at Gaddafi Central. |
| **Fully in stock** | Automatic | All units are **reserved**. Status: *Reserved, awaiting issue*. |
| **Partly in stock** | Automatic | Available units reserved; the balance becomes a **purchase requisition** under the same demand number and routes to approval. |
| **Not in stock** | Automatic | The whole quantity becomes a requisition. |
| **Budget check** | Automatic | If the shortfall exceeds the budget head's uncommitted amount, the demand is refused. CapEx/OpEx mismatch is warned. |
| **Issue from store** | Storekeeper | One click from **Ready to issue**. Stock leaves the store, a store issue note (SIN) is posted to the ledger, and the reservation is released. |
| **Requisition approval** | Director, then CFO above PKR 3M | Approve, reject or return. The demand's status and history update automatically. |
| **Edit** | Requester or Director | Needed-by date, purpose and budget head. Quantity and item are fixed once stock is reserved. |
| **Cancel** | Requester or Director | Reserved stock goes back to available and the pending requisition is withdrawn. The demand stays on record as Cancelled. |
| **Combined requirement** | Everyone | Open shortfalls added up by item across departments. |

### Module 2: Store & inventory (Stores & stock)

| Action | Who | What happens |
|---|---|---|
| **Stores** | Storekeeper, Director | Add a store (central, regional, departmental, sub-store) and edit its name, type and custodian. The Director can close a store, but only when it holds no stock. |
| **Stock position** | Everyone | Quantity of each item in each store, total, free at central, re-order alerts. |
| **Transfer stock** | Storekeeper, Director | Between any open stores. Reserved stock cannot be moved, and closed stores cannot receive. |
| **Receive a return** | Storekeeper, Director | Unused items come back into Gaddafi Central and onto the ledger. |
| **Movement history** | Everyone | Every receipt, issue, transfer, return and adjustment, filterable by type and item, with document numbers and recipients. |
| **Asset tags** | Everyone | Every tagged asset, its holder and status, with a QR label. Tags are created automatically at goods receipt or issue to staff. |
| **Stock-take** | Storekeeper starts and counts; Director approves | Start count → blind count sheet (book figures hidden) → save as you go → submit → the Director sees book vs counted with values → approve posts each variance as an adjustment. The counter cannot approve their own sheet. |

### The rest of the system (brief)

- **Custody:** issue assets to named staff, recipient confirmation with escalation, handover, repair/return, disposal through survey committee and approval, exit clearance.
- **Vendors:** registration with NTN/STRN checks, weighted prequalification score, document expiry, blacklisting through approval (debarred vendors cannot be invited).
- **Sourcing & evaluation:** PPRA method selector, bidding document review and lock, RFQ with minimum three vendors, two-envelope tender evaluation, comparative statement, bid securities.
- **Approvals:** approval matrix by value band, delegation, SLA escalation, Intention to Award with standstill window, grievance register.
- **PO & goods receipt:** PO generated from approved evaluation, PPRA gates before release, budget committed on release, GRN with inspection updating stock and average cost.
- **Three-way match:** invoice capture, 1% tolerance, exception handling, tax and withholding, payment release, finance system hand-off.
- **Reports:** item ledger, vendor scorecards, spend, stock and dead-stock reports for any period; scheduled delivery.

---

## 5. Rules that say "no" (great for questions)

Live proof that controls are enforced by the system, not by good behaviour:

- Nobody can approve their own request (the Director's rain-cover demand).
- A committee member cannot award a contract; only the Director can.
- A PO for the floodlight tender cannot be released until approval, Intention to Award and the standstill window are complete.
- A demand over budget is refused.
- Reserved stock cannot be issued twice or transferred away.
- An item code is never reused, and cannot be retired while stock is on hand.
- A store with stock cannot be closed.
- Whoever counted a stock-take cannot approve it.
- An invoice more than 1% off the PO price cannot be paid.
- Disposal of an asset needs survey committee and Director/CFO approval.
- The Auditor can view everything and change nothing.
- Past records cannot be edited or deleted, even directly in the database (Controls & audit → Try to change history).

---

## 6. Questions you are likely to get

**"Is this a mock-up?"**
No. Every button you saw writes to a real database, and the rules are enforced on the server. The data is sample data shaped on PCB's operations.

**"Where will the data live?"**
On PCB's choice of hosting: PCB's own data centre or a cloud region, per PCB's data residency policy. The same system runs in either.

**"Who owns it?"**
PCB. Source code, data and documentation are handed over at go-live. There are no per-user licence fees.

**"Can we change the approval limits or PPRA thresholds?"**
Yes. They are settings, not code, so they can be changed without a new release.

**"How do staff sign in?"**
In production, with PCB's existing login (single sign-on). The people shown today are demonstration accounts.

**"Does it work on a phone or tablet?"**
Yes, every screen adapts. The QR trace opens on any phone camera without an app.

**"What about our existing records?"**
Item codes, opening stock, vendors, open POs and custody records are migrated, de-duplicated and reconciled with PCB's sign-off before go-live. Old codes stay searchable, as the item master showed.

**"How long, and what does it cost?"**
Two and a half months, PKR 3.4M fixed, paid only on PCB's sign-off of each phase, with 5% held until the warranty closes. Annual support is PKR 600,000, starting after a free 90-day warranty.

**"What if something breaks?"**
Critical issues: response within one hour, any time, and resolution within four hours. The full table is on Our commitment.

---

## 7. If something goes wrong mid-demo

- **A screen looks out of date:** refresh the page. Your data is saved.
- **The data no longer matches this script:** sidebar name → **Reset demo data**, then start the act again.
- **You are signed in as the wrong person:** sidebar name → **Switch user**.
- **A button is missing:** you are probably in a role that cannot do that action. That is the access control working, so say so.
- **No internet:** run it locally (below) and present from `http://localhost:3000`.

---

## 8. Running it locally (backup)

```bash
npm install
npm run dev
```

Open http://localhost:3000. The database is created automatically on first start in `.data/pgdata`; nothing to install. To start completely fresh, stop the server, delete `.data/`, and start again.
