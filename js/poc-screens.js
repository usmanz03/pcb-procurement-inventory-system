/* ==========================================================================
   PCB POC — SCREEN MODULES
   Reports & analytics (M11), sourcing workspace (M5/M6), demand & inventory
   (M1/M2), custody lifecycle (M3), item master & vendors (M0/M4),
   global search, and the POC boot sequence.
   ========================================================================== */

(() => {
  const { D, esc, num, pkr, mil, parseD, fmtD, shortD, TODAY, stamp, svg, badge, cardHead, kpi, hydrate, setHTML, downloadCSV, vendorById, itemByCode, headById, storeName } = POC;
  const C = PcbCharts;

  const TYPE_LABEL = { GRN: 'Receipt (GRN)', ISSUE: 'Issue', TRANSFER_OUT: 'Transfer out', TRANSFER_IN: 'Transfer in', RETURN: 'Return', ADJUST: 'Stock-take adjustment' };
  const TYPE_KIND = { GRN: 'success', ISSUE: 'secondary', TRANSFER_OUT: 'info', TRANSFER_IN: 'info', RETURN: 'outline', ADJUST: 'warning' };
  const LIFECYCLE = ['Issued', 'In Use', 'Returned', 'Under Repair', 'Disposed'];
  const SOURCING_STAGES = ['Requisition', 'Method selected', 'Bidding document', 'Advertised', 'Bids received', 'Technical opening', 'Financial opening', 'Evaluation report', 'Approval', 'Intention to Award', 'Contract / PO'];
  const CATEGORIES = {
    SPO: { label: 'Sports gear', subs: { BALL: 'Cricket balls', BAT: 'Bats', PAD: 'Protective pads' } },
    INF: { label: 'Infrastructure', subs: { LGT: 'Floodlights', SCB: 'Scoreboards', CVR: 'Covers' } },
    TRF: { label: 'Turf & pitch machinery', subs: { MOW: 'Mowers', ROL: 'Rollers', PEN: 'Penetrometers' } },
    APP: { label: 'Apparel', subs: { KIT: 'Team kits', BAG: 'Kit bags' } },
    MED: { label: 'Medical & high performance', subs: { REC: 'Recovery', GPS: 'Athlete tracking' } },
    BRD: { label: 'Broadcast & technology', subs: { HWK: 'Ball tracking', CAM: 'Cameras' } }
  };

  const M = {

    /* ------------------------------------------------------------------
       LEDGER ENGINE (FR-0.5, FR-2.3, FR-11.2)
       ------------------------------------------------------------------ */
    ledgerCompute(code, from, to) {
      const L = D.itemLedgers[code];
      if (!L) return null;
      let qty = L.opening.qty, wac = L.opening.unitCost;
      const apply = (e) => { if (e.type === 'GRN' && qty + e.qty > 0) wac = (qty * wac + e.qty * e.unitCost) / (qty + e.qty); qty += e.qty; };
      const sorted = L.entries.slice().sort((a, b) => parseD(a.date) - parseD(b.date));
      sorted.filter(e => parseD(e.date) < from).forEach(apply);
      const open = { qty, wac, value: qty * wac };
      const rows = [];
      let receipts = 0, issues = 0, grnCount = 0;
      sorted.filter(e => { const d = parseD(e.date); return d >= from && d <= to; }).forEach(e => {
        apply(e);
        if (e.qty > 0) receipts += e.qty; else issues += -e.qty;
        if (e.type === 'GRN') grnCount++;
        rows.push({ ...e, balance: qty, wac });
      });
      const grns = sorted.filter(e => e.type === 'GRN' && parseD(e.date) <= to);
      const last = grns[grns.length - 1];
      return { open, rows, close: { qty, wac, value: qty * wac }, receipts, issues, grnCount, last };
    },

    ledgerClose(code) {
      const r = this.ledgerCompute(code, new Date(2000, 0, 1), new Date(2100, 0, 1));
      return r ? r.close : null;
    },

    /* ------------------------------------------------------------------
       REPORTS & ANALYTICS (Module 11)
       ------------------------------------------------------------------ */
    renderReportsShell() {
      setHTML('tab-reports', `
        <div class="shad-page-header">
          <div>
            <div class="eyebrow">Module 11</div>
            <h1 class="shad-page-title">Reports &amp; Analytics</h1>
            <p class="shad-page-description">Per-item and consolidated reports for any period, exportable to Excel and PDF, with scheduled email delivery.</p>
          </div>
          <div class="shad-page-actions no-print">
            <button type="button" class="shad-btn shad-btn-outline" onclick="app.openScheduleReport()">${svg('calendar')}<span>Schedule</span></button>
            <button type="button" class="shad-btn shad-btn-outline" onclick="app.exportReportExcel()">${svg('download')}<span>Excel</span></button>
            <button type="button" class="shad-btn shad-btn-default" onclick="window.print()">${svg('print')}<span>PDF</span></button>
          </div>
        </div>
        <div class="shad-card poc-section no-print">
          <div class="shad-card-content" style="padding-top:16px; padding-bottom:16px;">
            <div class="toolbar" style="margin:0;">
              <div class="seg" id="rpt-type">
                <button type="button" data-v="ledger" onclick="app.setReport('type','ledger')">Item ledger</button>
                <button type="button" data-v="vendors" onclick="app.setReport('type','vendors')">Vendors</button>
                <button type="button" data-v="procurement" onclick="app.setReport('type','procurement')">Procurement</button>
                <button type="button" data-v="inventory" onclick="app.setReport('type','inventory')">Inventory</button>
                <button type="button" data-v="activity" onclick="app.setReport('type','activity')">Activity log</button>
              </div>
              <span class="spacer"></span>
              <div class="seg" id="rpt-period">
                <button type="button" data-v="week" onclick="app.setReport('period','week')">Week</button>
                <button type="button" data-v="month" onclick="app.setReport('period','month')">Month</button>
                <button type="button" data-v="quarter" onclick="app.setReport('period','quarter')">Quarter</button>
                <button type="button" data-v="fytd" onclick="app.setReport('period','fytd')">FY to date</button>
                <button type="button" data-v="custom" onclick="app.setReport('period','custom')">Custom</button>
              </div>
            </div>
            <div class="toolbar" style="margin:12px 0 0;" id="rpt-sub"></div>
          </div>
        </div>
        <div id="rpt-body"></div>
        <div class="shad-card no-print">
          ${cardHead('Scheduled deliveries', 'Reports generated automatically and emailed in PDF and Excel.')}
          <div class="shad-card-content table-scroll" style="padding:0;"><table class="shad-table"><thead><tr><th>Report</th><th>Frequency</th><th>Recipients</th><th>Format</th><th>Next run</th></tr></thead><tbody id="rpt-sched"></tbody></table></div>
        </div>`);
    },

    setReport(key, val) {
      this.poc[key === 'type' ? 'reportType' : key === 'period' ? 'period' : key] = val;
      this.renderReports();
    },

    periodRange() {
      const p = this.poc.period;
      if (p === 'week') return { from: new Date(2026, 9, 7), to: TODAY, label: 'Week to date, 07–13 Oct 2026', months: [3] };
      if (p === 'month') return { from: new Date(2026, 9, 1), to: TODAY, label: 'October 2026 to date', months: [3] };
      if (p === 'quarter') return { from: new Date(2026, 6, 1), to: new Date(2026, 8, 30), label: 'Q1 FY 2026-27 (Jul–Sep 2026)', months: [0, 1, 2] };
      if (p === 'custom') {
        const f = new Date(this.poc.custom.from), t = new Date(this.poc.custom.to);
        const months = [0, 1, 2, 3].filter(i => { const ms = new Date(2026, 6 + i, 1), me = new Date(2026, 7 + i, 0); return me >= f && ms <= t; });
        return { from: new Date(f.getFullYear(), f.getMonth(), f.getDate()), to: new Date(t.getFullYear(), t.getMonth(), t.getDate()), label: `${fmtD(f)} to ${fmtD(t)}`, months: months.length ? months : [3] };
      }
      return { from: new Date(2026, 6, 1), to: TODAY, label: 'FY 2026-27 to date (from 01-Jul-2026)', months: [0, 1, 2, 3] };
    },

    renderReports() {
      if (!document.getElementById('rpt-body')) this.renderReportsShell();
      const type = this.poc.reportType;
      document.querySelectorAll('#rpt-type button').forEach(b => b.classList.toggle('active', b.dataset.v === type));
      document.querySelectorAll('#rpt-period button').forEach(b => b.classList.toggle('active', b.dataset.v === this.poc.period));
      const range = this.periodRange();
      setHTML('rpt-sub', `
        <span class="shad-badge shad-badge-outline">${svg('calendar', 11)}${esc(range.label)}</span>
        ${this.poc.period === 'custom' ? `<label class="small muted" for="rpt-from">From</label><input type="date" class="shad-input" style="width:160px;" id="rpt-from" value="${this.poc.custom.from}" onchange="app.poc.custom.from=this.value; app.renderReports()">
          <label class="small muted" for="rpt-to">To</label><input type="date" class="shad-input" style="width:160px;" id="rpt-to" value="${this.poc.custom.to}" onchange="app.poc.custom.to=this.value; app.renderReports()">` : ''}
        ${type === 'ledger' ? `<span class="spacer"></span><label class="small muted" for="rpt-item">Item code</label>
          <select class="shad-select" id="rpt-item" style="width:auto; min-width:320px;" onchange="app.setReport('ledgerItem', this.value)">
            ${D.itemsMaster.map(i => `<option value="${i.code}" ${i.code === this.poc.ledgerItem ? 'selected' : ''}>${i.code} · ${esc(i.name.slice(0, 44))}</option>`).join('')}
          </select>` : ''}`);
      const body = { ledger: () => this.reportLedger(range), vendors: () => this.reportVendors(), procurement: () => this.reportProcurement(range), inventory: () => this.reportInventory(), activity: () => this.reportActivity() }[type];
      body();
      setHTML('rpt-sched', this.poc.scheduled.map(s => `<tr class="${s.isNew ? 'is-new' : ''}"><td class="strong">${esc(s.name)}</td><td>${esc(s.freq)}</td><td class="small mono">${esc(s.to)}</td><td>${esc(s.fmt)}</td><td class="small">${esc(s.next)}</td></tr>`).join(''));
      this.poc.scheduled.forEach(s => delete s.isNew);
    },

    reportLedger(range) {
      const code = this.poc.ledgerItem;
      const item = itemByCode(code);
      const r = this.ledgerCompute(code, range.from, range.to);
      const priceDiff = r.last ? ((r.last.unitCost - r.close.wac) / r.close.wac) * 100 : 0;
      setHTML('rpt-body', `
        <div class="shad-card poc-section">
          <div class="shad-card-header"><div class="card-head-row"><div>
            <div class="eyebrow">Item ledger · Gaddafi Stadium Central Store</div>
            <h2 class="shad-card-title" style="display:block; font-size:18px;">${esc(item.name)}</h2>
            <p class="shad-card-description"><span class="mono">${code}</span> · ${esc(item.classification)} · ${esc(item.budgetType)} · UoM ${esc(item.uom)}</p></div>
            <div class="chip-row">${item.totalStock <= item.reorderLevel ? badge('warning', 'At or below re-order level', 'alert') : badge('success', 'Stock healthy', 'check')}</div></div></div>
          <div class="shad-card-content">
            <div class="summary-strip" style="margin-bottom:0;">
              <div><div class="lbl">Opening stock</div><div class="val">${num(r.open.qty)}</div><div class="meta">${pkr(r.open.value)}</div></div>
              <div><div class="lbl">Receipts</div><div class="val t-success">+${num(r.receipts)}</div><div class="meta">${r.grnCount} GRN${r.grnCount === 1 ? '' : 's'} plus returns and transfers in</div></div>
              <div><div class="lbl">Issues</div><div class="val">−${num(r.issues)}</div><div class="meta">To departments, custodians and stores</div></div>
              <div><div class="lbl">Closing stock</div><div class="val">${num(r.close.qty)}</div><div class="meta">${pkr(r.close.value)} on hand</div></div>
              <div><div class="lbl">Last price vs average</div><div class="val">${r.last ? pkr(r.last.unitCost).replace('PKR ', '') : '—'}</div><div class="meta">WAC ${pkr(r.close.wac)}${r.last ? ` · <span class="${priceDiff > 0 ? 't-warning' : 't-success'}">${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(1)}%</span>` : ''}</div></div>
            </div>
          </div>
        </div>
        <div class="poc-grid-2-even">
          <div class="shad-card chart-card">${cardHead('Stock balance', 'Balance after each movement in the period.', `<div class="chart-legend"><span><i class="line" style="--c:var(--chart-1)"></i>Balance</span><span><i class="dash" style="--c:var(--chart-3)"></i>Re-order level</span></div>`)}<div class="shad-card-content"><div id="rpt-bal-chart"></div></div></div>
          <div class="shad-card chart-card">${cardHead('Price trend', 'Purchase price on each receipt against weighted average cost, FY to date.', `<div class="chart-legend"><span><i class="line" style="--c:var(--chart-2)"></i>Purchase price</span><span><i class="line" style="--c:var(--chart-1)"></i>Weighted average</span></div>`)}<div class="shad-card-content"><div id="rpt-price-chart"></div></div></div>
        </div>
        <div class="shad-card poc-section">
          ${cardHead('Movements', `${r.rows.length} movement${r.rows.length === 1 ? '' : 's'} in ${esc(range.label)}`)}
          <div class="shad-card-content table-scroll" style="padding:0;">
            <table class="shad-table" id="rpt-main-table"><thead><tr><th>Date</th><th>Document</th><th>Type</th><th>Linked ref</th><th>Vendor / department</th><th>Custodian → recipient</th><th>Purpose</th><th class="right">In</th><th class="right">Out</th><th class="right">Balance</th><th class="right">WAC (PKR)</th></tr></thead>
            <tbody>
              <tr style="background:hsl(var(--muted)/.35);"><td class="small nowrap">${fmtD(range.from)}</td><td colspan="6" class="small strong">Opening balance</td><td></td><td></td><td class="right num strong">${num(r.open.qty)}</td><td class="right num">${num(r.open.wac)}</td></tr>
              ${r.rows.map(e => `<tr>
                <td class="small nowrap">${esc(e.date)}</td><td class="mono small">${esc(e.ref)}</td><td>${badge(TYPE_KIND[e.type], TYPE_LABEL[e.type])}</td>
                <td class="mono small">${esc(e.doc)}</td><td class="small">${esc(e.party)}</td>
                <td class="small">${e.custodian ? `${esc(e.custodian)} → ${esc(e.recipient)}` : '—'}</td><td class="small">${esc(e.purpose)}</td>
                <td class="right num t-success">${e.qty > 0 ? num(e.qty) : ''}</td><td class="right num">${e.qty < 0 ? num(-e.qty) : ''}</td>
                <td class="right num strong">${num(e.balance)}</td><td class="right num">${num(e.wac)}</td></tr>`).join('') || `<tr><td colspan="11"><div class="empty">No movements in this period.</div></td></tr>`}
              <tr style="background:hsl(var(--muted)/.35);"><td class="small nowrap">${fmtD(range.to)}</td><td colspan="6" class="small strong">Closing balance · ${pkr(r.close.value)}</td><td class="right num">${num(r.receipts)}</td><td class="right num">${num(r.issues)}</td><td class="right num strong">${num(r.close.qty)}</td><td class="right num">${num(r.close.wac)}</td></tr>
            </tbody></table>
          </div>
        </div>`);

      const balLabels = ['Open'].concat(r.rows.map(e => shortD(e.date)));
      const balVals = [r.open.qty].concat(r.rows.map(e => e.balance));
      if (balVals.length === 1) { balLabels.push('Close'); balVals.push(r.close.qty); }
      C.line(document.getElementById('rpt-bal-chart'), {
        labels: balLabels, height: 220, aria: 'Stock balance over the period',
        series: [{ name: 'Balance', color: '--chart-1', values: balVals, area: true }],
        target: item.reorderLevel <= Math.max(...balVals) * 1.5 ? { value: item.reorderLevel, label: `Re-order ${item.reorderLevel}` } : undefined,
        fmt: v => num(v), tipTitle: i => i === 0 ? `Opening, ${fmtD(range.from)}` : (r.rows[i - 1] ? `${r.rows[i - 1].date} · ${r.rows[i - 1].ref}` : 'Closing')
      });

      const all = this.ledgerCompute(code, new Date(2026, 6, 1), range.to);
      const grnRows = all.rows.filter(e => e.type === 'GRN');
      const pLabels = ['Opening'].concat(grnRows.map(e => shortD(e.date)));
      C.line(document.getElementById('rpt-price-chart'), {
        labels: pLabels, height: 220, aria: 'Purchase price and weighted average cost',
        series: [
          { name: 'Purchase price', color: '--chart-2', values: [null].concat(grnRows.map(e => e.unitCost / 1000)) },
          { name: 'Weighted average', color: '--chart-1', values: [D.itemLedgers[code].opening.unitCost / 1000].concat(grnRows.map(e => e.wac / 1000)), area: true }
        ],
        fmt: v => `${num(v)}k`, tipFmt: v => `PKR ${num(v * 1000)}`, tipTitle: i => i === 0 ? 'Opening (01-Jul-2026)' : `${grnRows[i - 1].date} · ${grnRows[i - 1].ref}`
      });
    },

    reportVendors() {
      const rows = D.vendors;
      setHTML('rpt-body', `
        <div class="poc-grid-2-even">
          <div class="shad-card chart-card">${cardHead('On-time delivery', 'Share of deliveries by PO due date, FY to date.')}<div class="shad-card-content"><div id="rpt-v-ontime"></div></div></div>
          <div class="shad-card chart-card">${cardHead('Order value', 'Total purchase order value, PKR millions, FY to date.')}<div class="shad-card-content"><div id="rpt-v-value"></div></div></div>
        </div>
        <div class="shad-card poc-section">
          ${cardHead('Vendor performance report', 'Orders, value, delivery and quality per vendor.')}
          <div class="shad-card-content table-scroll" style="padding:0;">
            <table class="shad-table" id="rpt-main-table"><thead><tr><th>Vendor</th><th class="right">POs issued</th><th class="right">Order value (PKR)</th><th class="right">Pending</th><th class="right">Completed</th><th class="right">On-time %</th><th class="right">Defect %</th><th class="right">Rating</th><th>Status</th></tr></thead>
            <tbody>${rows.map(v => `<tr><td><div class="strong">${esc(v.name)}</div><div class="sub">${esc(v.category)} · NTN ${esc(v.ntn)}</div></td>
              <td class="right num">${v.pos}</td><td class="right num">${num(v.value)}</td><td class="right num">${v.pending}</td><td class="right num">${v.pos - v.pending}</td>
              <td class="right num ${v.onTime < 80 ? 't-danger strong' : ''}">${v.onTime}%</td><td class="right num">${v.defects.toFixed(1)}%</td><td class="right num">${v.rating.toFixed(1)}</td>
              <td>${this.vendorStatusBadge(v)}</td></tr>`).join('')}</tbody></table>
          </div>
        </div>`);
      C.hbars(document.getElementById('rpt-v-ontime'), rows.map(v => ({ name: v.name.split(' (')[0], value: v.onTime, color: v.onTime < 80 ? '--chart-5' : '--chart-1' })), { fmt: v => `${v}%` });
      C.hbars(document.getElementById('rpt-v-value'), rows.slice().sort((a, b) => b.value - a.value).map(v => ({ name: v.name.split(' (')[0], value: v.value / 1e6, color: '--chart-2' })), { fmt: v => `${v.toFixed(1)}M` });
    },

    reportProcurement(range) {
      const A = D.analytics;
      const idx = range.months;
      setHTML('rpt-body', `
        <div class="poc-grid-2-even">
          <div class="shad-card chart-card">${cardHead('Spend by department', 'Committed value, PKR millions, FY to date.')}<div class="shad-card-content"><div id="rpt-p-dept"></div></div></div>
          <div class="shad-card chart-card">${cardHead('Spend by category', 'Committed value, PKR millions, FY to date.')}<div class="shad-card-content"><div id="rpt-p-cat"></div></div></div>
        </div>
        <div class="poc-grid-2-even">
          <div class="shad-card chart-card">${cardHead('Committed spend by month', esc(range.label), `<div class="chart-legend"><span><i style="--c:var(--chart-1)"></i>CapEx</span><span><i style="--c:var(--chart-2)"></i>OpEx</span></div>`)}<div class="shad-card-content"><div id="rpt-p-month"></div></div></div>
          <div class="shad-card chart-card">${cardHead('Demand-to-PO cycle time', 'Average days from demand to purchase order.', `<div class="chart-legend"><span><i style="--c:var(--chart-4)"></i>Days</span><span><i class="dash" style="--c:var(--chart-3)"></i>Target 30</span></div>`)}<div class="shad-card-content"><div id="rpt-p-cycle"></div></div></div>
        </div>
        <div class="shad-card poc-section">
          ${cardHead('Tender history', 'All sourcing events this financial year.')}
          <div class="shad-card-content table-scroll" style="padding:0;">
            <table class="shad-table" id="rpt-main-table"><thead><tr><th>Reference</th><th>Title</th><th>Method</th><th class="right">Value (PKR)</th><th class="right">Bidders</th><th class="right">Days open</th><th>Stage</th></tr></thead>
            <tbody>${D.tenderHistory.map(t => `<tr><td class="mono small">${esc(t.ref)}</td><td class="strong">${esc(t.title)}</td><td class="small">${esc(t.method)}</td><td class="right num">${num(t.value)}</td><td class="right num">${t.bidders}</td><td class="right num">${t.days}</td>
              <td>${t.stage === 'Completed' || t.stage === 'PO issued' ? badge('success', t.stage, 'check') : t.stage === 'Grievance' ? badge('warning', t.stage, 'gavel') : t.stage === 'Intention to award' ? badge('award', t.stage, 'trophy') : badge('info', t.stage, 'clock')}</td></tr>`).join('')}</tbody></table>
          </div>
        </div>`);
      C.hbars(document.getElementById('rpt-p-dept'), D.spendByDept.map(r => ({ name: r.name, value: r.value / 1e6 })), { fmt: v => `${v.toFixed(1)}M` });
      C.hbars(document.getElementById('rpt-p-cat'), D.spendByCategory.map(r => ({ name: r.name, value: r.value / 1e6, color: '--chart-2' })), { fmt: v => `${v.toFixed(1)}M` });
      C.bars(document.getElementById('rpt-p-month'), {
        labels: idx.map(i => A.months[i]), stacked: true, height: 220, aria: 'Committed spend by month',
        series: [{ name: 'CapEx', color: '--chart-1', values: idx.map(i => A.committedCapex[i]) }, { name: 'OpEx', color: '--chart-2', values: idx.map(i => A.committedOpex[i]) }],
        fmt: v => (Number.isInteger(v) ? v : v.toFixed(1)), tipFmt: v => `PKR ${v.toFixed(1)}M`, tipTitle: i => A.monthLabels[idx[i]]
      });
      C.bars(document.getElementById('rpt-p-cycle'), {
        labels: A.months, height: 220, aria: 'Demand to PO cycle time', totals: true,
        series: [{ name: 'Cycle time', color: '--chart-4', values: A.cycleDays }],
        fmt: v => v, tipFmt: v => `${v} days`, target: { value: A.cycleTarget, label: '' }, tipTitle: i => A.monthLabels[i]
      });
    },

    reportInventory() {
      const low = D.itemsMaster.filter(i => i.totalStock <= i.reorderLevel);
      setHTML('rpt-body', `
        <div class="poc-grid-2-even">
          <div class="shad-card chart-card">${cardHead('Valuation by store', 'PKR millions, current.')}<div class="shad-card-content"><div id="rpt-i-store"></div></div></div>
          <div class="shad-card chart-card">${cardHead('Total stock value', 'Month-end value across all stores, PKR millions.')}<div class="shad-card-content"><div id="rpt-i-trend"></div></div></div>
        </div>
        <div class="poc-grid-2-even">
          <div class="shad-card">${cardHead('Low stock', 'At or below re-order level.')}<div class="shad-card-content table-scroll" style="padding:0;"><table class="shad-table"><thead><tr><th>Item</th><th class="right">On hand</th><th class="right">Re-order level</th></tr></thead><tbody>
            ${low.map(i => `<tr><td><div class="strong">${esc(i.name.slice(0, 48))}</div><div class="sub mono">${i.code}</div></td><td class="right num t-warning strong">${i.totalStock}</td><td class="right num">${i.reorderLevel}</td></tr>`).join('') || '<tr><td colspan="3"><div class="empty">No items below re-order level.</div></td></tr>'}</tbody></table></div></div>
          <div class="shad-card">${cardHead('Dead stock', 'No movement for more than 180 days.')}<div class="shad-card-content table-scroll" style="padding:0;"><table class="shad-table"><thead><tr><th>Item</th><th>Store</th><th class="right">Value (PKR)</th><th class="right">Idle days</th></tr></thead><tbody>
            ${D.deadStock.map(i => `<tr><td><div class="strong">${esc(i.name)}</div><div class="sub mono">${i.code}</div></td><td class="small">${esc(i.store)}</td><td class="right num">${num(i.value)}</td><td class="right num t-danger strong">${i.days}</td></tr>`).join('')}</tbody></table></div></div>
        </div>
        <div class="shad-card poc-section">
          ${cardHead('Current stock by store', 'Quantity on hand per store, consolidated.')}
          <div class="shad-card-content table-scroll" style="padding:0;">
            <table class="shad-table" id="rpt-main-table"><thead><tr><th>Item code</th><th>Description</th>${D.stadiumStores.map(s => `<th class="right">${esc(s.city === 'Lahore' && s.id !== 'STORE-LHR-01' ? 'NCA' : s.city)}</th>`).join('')}<th class="right">Total</th><th class="right">Value (PKR)</th></tr></thead>
            <tbody>${D.itemsMaster.map(i => `<tr><td class="mono small">${i.code}</td><td class="strong">${esc(i.name.slice(0, 46))}</td>${D.stadiumStores.map(s => `<td class="right num">${i.storeBreakdown[s.id] ?? 0}</td>`).join('')}<td class="right num strong">${i.totalStock}</td><td class="right num">${num(i.totalStock * i.avgCostPkr)}</td></tr>`).join('')}</tbody></table>
          </div>
        </div>`);
      C.hbars(document.getElementById('rpt-i-store'), D.stadiumStores.map(s => ({ name: s.name.replace(' Stadium', '').replace(' Central Store', ''), value: s.valuationPkr / 1e6 })), { fmt: v => `${v.toFixed(1)}M` });
      C.line(document.getElementById('rpt-i-trend'), { labels: D.analytics.months, height: 210, series: [{ name: 'Stock value', color: '--chart-1', values: D.analytics.stockValue, area: true }], fmt: v => `${v}`, tipFmt: v => `PKR ${v.toFixed(1)}M`, tipTitle: i => D.analytics.monthLabels[i] });
    },

    reportActivity() {
      setHTML('rpt-body', `
        <div class="shad-card poc-section">
          ${cardHead('System activity log', 'Every create, approve, issue and receipt, with user and time. Append-only and exportable for audit.', badge('outline', 'Tamper-evident', 'shield'))}
          <div class="shad-card-content table-scroll" style="padding:0;">
            <table class="shad-table" id="rpt-main-table"><thead><tr><th>When</th><th>Event</th><th>Category</th><th>User</th><th>Detail</th></tr></thead>
            <tbody>${D.recentActivities.map(a => `<tr><td class="small nowrap">${esc(a.at || a.time)}</td><td class="strong">${esc(a.title)}</td><td>${badge('secondary', a.badge)}</td><td class="small">${esc(a.user || 'System')}</td><td class="small muted">${esc(a.details)}</td></tr>`).join('')}</tbody></table>
          </div>
        </div>`);
    },

    exportReportExcel() {
      const t = document.getElementById('rpt-main-table');
      if (!t) return;
      const rows = [...t.querySelectorAll('tr')].map(tr => [...tr.children].map(td => td.textContent.replace(/\s+/g, ' ').trim()));
      downloadCSV(`PCB_${this.poc.reportType}_${this.poc.period}_${D.today}.csv`, rows);
      this.logAudit('Report exported', `${this.poc.reportType} report exported to Excel.`, 'Reports');
    },

    openScheduleReport() {
      const names = { ledger: 'Item ledger', vendors: 'Vendor performance', procurement: 'Procurement summary', inventory: 'Inventory position', activity: 'Activity log' };
      this.openModal('sched-dialog', { footer: false,
        title: 'Schedule report delivery',
        content: `<div class="form-grid">
          <div class="span-2"><label class="shad-label" for="sch-name">Report</label><select class="shad-select" id="sch-name">${Object.entries(names).map(([k, v]) => `<option ${k === this.poc.reportType ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
          <div><label class="shad-label" for="sch-freq">Frequency</label><select class="shad-select" id="sch-freq"><option>Weekly</option><option selected>Monthly</option><option>Quarterly</option><option>Annual</option></select></div>
          <div><label class="shad-label" for="sch-fmt">Format</label><select class="shad-select" id="sch-fmt"><option>PDF + Excel</option><option>PDF</option><option>Excel</option></select></div>
          <div class="span-2"><label class="shad-label" for="sch-to">Recipients</label><input class="shad-input" id="sch-to" value="cfo@pcb.com.pk, director.procurement@pcb.com.pk"></div>
        </div>
        <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;"><button type="button" class="shad-btn shad-btn-outline" onclick="app.closeDialog('sched-dialog')">Cancel</button><button type="button" class="shad-btn shad-btn-default" onclick="app.saveSchedule()">Schedule</button></div>`
      });
    },

    saveSchedule() {
      const freq = document.getElementById('sch-freq').value;
      const next = { Weekly: '20-Oct-2026 07:00', Monthly: '01-Nov-2026 07:00', Quarterly: '01-Jan-2027 07:00', Annual: '01-Jul-2027 07:00' }[freq];
      this.poc.scheduled.unshift({ name: document.getElementById('sch-name').value, freq, to: document.getElementById('sch-to').value, fmt: document.getElementById('sch-fmt').value, next, isNew: true });
      this.closeDialog('sched-dialog');
      this.toast('Report scheduled', `Next delivery ${next}.`);
      this.renderReports();
    },

    /* ------------------------------------------------------------------
       SOURCING WORKSPACE (Module 5) & EVALUATION REPORT (FR-6.6)
       ------------------------------------------------------------------ */
    openSourcing(view) {
      this.poc.sourcingView = view;
      this.showTab('tenders');
      this.renderSourcing();
      const el = document.getElementById('sourcing-workspace');
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    },

    renderSourcing() {
      const el = document.getElementById('sourcing-workspace');
      if (!el) return;
      const v = this.poc.sourcingView;
      const tabs = [['lifecycle', 'Tender lifecycle'], ['method', 'Method selection'], ['rfq', 'RFQ'], ['docs', 'Bidding documents'], ['guarantees', 'Bid security & guarantees']];
      el.innerHTML = `
        <div class="shad-card-header"><div class="card-head-row"><div><h2 class="shad-card-title">Sourcing workspace · Module 5</h2><p class="shad-card-description">Method selection, bidding documents, RFQs and guarantees, configured against PPRA rules.</p></div>
          <div class="seg">${tabs.map(([k, l]) => `<button type="button" class="${k === v ? 'active' : ''}" onclick="app.poc.sourcingView='${k}'; app.renderSourcing()">${l}</button>`).join('')}</div></div></div>
        <div class="shad-card-content" id="sourcing-body"></div>`;
      ({ lifecycle: () => this.sourcingLifecycle(), method: () => this.sourcingMethod(), rfq: () => this.sourcingRFQ(), docs: () => this.sourcingDocs(), guarantees: () => this.sourcingGuarantees() })[v]();
    },

    sourcingLifecycle() {
      const t = D.tenders[this.currentTenderIndex] || D.tenders[0];
      const at = this.currentTenderIndex === 0 ? (this.poc.t089.po ? 10 : this.poc.t089.ita ? 9 : 8) : 9;
      const days = Math.round((parseD(t.techOpeningDate) - parseD(t.publishDate)) / 86400000);
      setHTML('sourcing-body', `
        <div class="stepper" style="margin-bottom:16px;">${SOURCING_STAGES.map((s, i) => `<span class="step ${i < at ? 'is-done' : i === at ? 'is-now' : ''}"><i>${i < at ? '✓' : i + 1}</i>${s}</span>`).join('')}</div>
        <div class="poc-grid-3" style="grid-template-columns:repeat(4,minmax(0,1fr));">
          <div class="panel"><div class="panel-title">Method</div><div class="strong small">${esc(t.method)}</div></div>
          <div class="panel"><div class="panel-title">Bidding document</div><div class="strong small">${esc(t.sbdTemplate)}</div></div>
          <div class="panel"><div class="panel-title">Bid submission period</div><div class="strong small">${days} days (${esc(t.publishDate)} → ${esc(t.techOpeningDate)})</div><div style="margin-top:6px;">${days >= 15 ? badge('success', 'Meets 15-day minimum', 'check') : badge('destructive', 'Below minimum', 'alert')}</div></div>
          <div class="panel"><div class="panel-title">Current stage</div><div class="strong small">${esc(t.currentStage)}</div><div class="small muted" style="margin-top:4px;">Financial opening ${esc(t.finOpeningDate)}</div></div>
        </div>`);
    },

    sourcingMethod() {
      setHTML('sourcing-body', `
        <div class="poc-grid-2" style="margin-bottom:0;">
          <div>
            <div class="form-grid">
              <div><label class="shad-label" for="ms-value">Estimated value (PKR)</label><input class="shad-input num" id="ms-value" type="number" value="${this.poc.msValue}" oninput="app.poc.msValue=+this.value; app.renderMethodResult()"></div>
              <div><label class="shad-label" for="ms-type">Procurement type</label><select class="shad-select" id="ms-type"><option>Goods</option><option>Works</option><option>Services</option></select></div>
              <div class="span-2"><label class="shad-label" for="ms-special">Special circumstance</label><select class="shad-select" id="ms-special" onchange="app.poc.msSpecial=this.value; app.renderMethodResult()">
                <option value="none" ${this.poc.msSpecial === 'none' ? 'selected' : ''}>None</option><option value="sole" ${this.poc.msSpecial === 'sole' ? 'selected' : ''}>Sole source (direct contracting)</option><option value="emergency" ${this.poc.msSpecial === 'emergency' ? 'selected' : ''}>Emergency</option></select></div>
            </div>
            <div id="ms-result" style="margin-top:16px;"></div>
          </div>
          <div>
            <div class="panel-title">Configured thresholds</div>
            <table class="shad-table" id="ms-table"><thead><tr><th>Value up to</th><th>Method</th><th>Advertisement</th></tr></thead><tbody></tbody></table>
            <p class="small muted" style="margin-top:10px;">Thresholds are configuration, not code. Figures are illustrative until PCB confirms the applicable PPRA regime in Phase 0.</p>
          </div>
        </div>`);
      this.renderMethodResult();
    },

    renderMethodResult() {
      const v = this.poc.msValue || 0;
      const special = this.poc.msSpecial;
      const idx = D.methodThresholds.findIndex(t => v <= t.max);
      const t = D.methodThresholds[idx];
      const band = v <= 100000 ? 'B1' : v <= 3000000 ? 'B2' : v <= 20000000 ? 'B3' : v <= 50000000 ? 'B4' : 'B5';
      const chain = D.approvalMatrix.find(b => b.band === band).chain;
      let method = t.method, docs = t.docs, advert = t.advert, minDays = t.minDays, note = '';
      if (special === 'sole') { method = 'Direct contracting'; docs = 'Recorded justification, single-source negotiation record'; advert = 'Award published after contract'; minDays = 0; note = 'Requires approval one band higher than the value band.'; }
      if (special === 'emergency') { method = 'Emergency procurement'; docs = 'Emergency certificate, post-facto documentation within 15 days'; advert = 'Award published after contract'; minDays = 0; note = 'Post-facto report to the approving authority is mandatory.'; }
      setHTML('ms-result', `
        <div class="callout callout-gold">${svg('gavel', 16)}<div><b>${esc(method)}</b>
          <div>${esc(docs)}</div>
          <dl class="kv" style="margin-top:8px; grid-template-columns:140px 1fr;"><dt>Advertisement</dt><dd>${esc(advert)}</dd><dt>Minimum bid period</dt><dd>${minDays ? minDays + ' days' : 'Not applicable'}</dd><dt>Approval band</dt><dd>${band}: ${chain.map(esc).join(' → ')}</dd></dl>
          ${note ? `<div class="small" style="margin-top:6px;">${esc(note)}</div>` : ''}</div></div>`);
      const tb = document.querySelector('#ms-table tbody');
      if (tb) tb.innerHTML = D.methodThresholds.map((x, i) => `<tr class="${i === idx && special === 'none' ? 'is-selected' : ''}"><td class="num">${x.max === Infinity ? 'Above 3,000,000' : num(x.max)}</td><td class="strong small">${esc(x.method)}</td><td class="small">${esc(x.advert)}</td></tr>`).join('');
    },

    sourcingRFQ() {
      const q = D.rfq, s = this.poc.rfq;
      const vendors = q.vendorIds.map(vendorById);
      const eligible = (v) => v.status === 'Eligible';
      const quotes = s.quotes.map(x => ({ ...x, v: vendorById(x.vendorId) }));
      const remaining = q.quoteBook.filter(b => s.selected.has(b.vendorId) && !s.quotes.find(x => x.vendorId === b.vendorId));
      setHTML('sourcing-body', `
        <div class="card-head-row" style="margin-bottom:14px;">
          <div><div class="strong">${esc(q.id)} · ${esc(q.title)}</div><div class="small muted">Estimated ${pkr(q.estValue)} · Request for Quotations (minimum 3) · closes ${esc(q.closes)}</div></div>
          ${s.dispatched ? badge('success', `Sent to ${s.selected.size} vendors`, 'mail') : badge('secondary', 'Draft')}
        </div>
        <div class="poc-grid-2-even" style="margin-bottom:0;">
          <div>
            <div class="panel-title">Invite vendors</div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${vendors.map(v => `<label class="shad-check ${!eligible(v) ? 'is-disabled' : ''}">
                <input type="checkbox" ${s.selected.has(v.id) && eligible(v) ? 'checked' : ''} ${!eligible(v) || s.dispatched ? 'disabled' : ''} onchange="app.toggleRFQVendor('${v.id}', this.checked)">
                <span style="flex:1;"><span class="strong">${esc(v.name)}</span><span class="sub" style="display:block;">${esc(v.category)} · prequalification ${v.prequal}/100</span></span>
                ${eligible(v) ? (s.dispatched && s.selected.has(v.id) ? badge('info', 'Invited', 'mail') : '') : badge('destructive', v.status === 'Blacklisted' ? 'Blacklisted' : 'Excluded: blacklisting proposed', 'lock')}
              </label>`).join('')}
            </div>
            ${!s.dispatched ? `<button type="button" class="shad-btn shad-btn-default" style="margin-top:12px;" data-write ${s.selected.size < 3 ? 'disabled' : ''} onclick="app.dispatchRFQ()">${svg('mail')}<span>Email RFQ to ${s.selected.size} vendors</span></button>
              ${s.selected.size < 3 ? '<div class="small t-warning" style="margin-top:6px;">Select at least 3 vendors.</div>' : ''}` : ''}
          </div>
          <div>
            <div class="panel-title">Quotations received</div>
            ${s.dispatched ? `
              <table class="shad-table"><thead><tr><th>Vendor</th><th class="right">Quoted (PKR)</th><th>Delivery</th><th>Received</th></tr></thead><tbody>
                ${quotes.map(x => `<tr class="${x.isNew ? 'is-new' : ''}"><td class="strong small">${esc(x.v.name.split(' (')[0])}</td><td class="right num">${num(x.base)}</td><td class="small">${esc(x.delivery)}</td><td class="small muted">${esc(x.at)}</td></tr>`).join('') || '<tr><td colspan="4"><div class="empty">Waiting for quotations.</div></td></tr>'}
              </tbody></table>
              <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
                ${remaining.length ? `<button type="button" class="shad-btn shad-btn-outline shad-btn-sm" data-write onclick="app.receiveQuote()">${svg('refresh')}<span>Receive next quotation (demo)</span></button>` : ''}
                <button type="button" class="shad-btn shad-btn-default shad-btn-sm" ${quotes.length < 3 ? 'disabled' : ''} onclick="app.openRFQComparative()">${svg('chart')}<span>Generate comparative statement</span></button>
              </div>
              <div class="small muted" style="margin-top:8px;">Quotations submitted on the vendor portal or by linked email are captured against the RFQ automatically.</div>`
            : '<div class="empty">Quotations appear here once the RFQ is sent.</div>'}
          </div>
        </div>`);
      s.quotes.forEach(x => delete x.isNew);
    },

    toggleRFQVendor(id, on) { if (on) this.poc.rfq.selected.add(id); else this.poc.rfq.selected.delete(id); this.renderSourcing(); },

    dispatchRFQ() {
      this.poc.rfq.dispatched = true;
      this.logAudit('RFQ dispatched', `${D.rfq.id} emailed to ${this.poc.rfq.selected.size} vendors.`, 'Sourcing', 'Sent from the standard RFQ template v2.1 with one click.');
      this.toast('RFQ sent', `${D.rfq.id} emailed to ${this.poc.rfq.selected.size} vendors.`);
      this.renderSourcing();
    },

    receiveQuote() {
      const s = this.poc.rfq;
      const next = D.rfq.quoteBook.find(b => s.selected.has(b.vendorId) && !s.quotes.find(x => x.vendorId === b.vendorId));
      if (!next) return;
      const n = new Date();
      s.quotes.push({ ...next, at: `${D.today.slice(0, 6)} ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`, isNew: true });
      this.renderSourcing();
    },

    openRFQComparative() {
      const rows = this.poc.rfq.quotes.map(x => ({ ...x, v: vendorById(x.vendorId), tax: x.base * 0.18, total: x.base * 1.18 })).sort((a, b) => a.total - b.total);
      this.openModal('rfq-cst-dialog', {
        title: `Comparative statement · ${D.rfq.id}`,
        content: `<p class="small muted" style="margin-bottom:12px;">Sales tax applied at 18% where the quotation omitted it, so all bids compare on the same basis.</p>
          <table class="shad-table"><thead><tr><th>Rank</th><th>Vendor</th><th class="right">Quoted</th><th class="right">Sales tax</th><th class="right">Evaluated total</th><th>Delivery</th></tr></thead><tbody>
          ${rows.map((r, i) => `<tr class="${i === 0 ? 'is-award' : ''}"><td>${i === 0 ? badge('award', '#1', 'trophy') : badge('outline', '#' + (i + 1))}</td><td class="strong">${esc(r.v.name)}</td><td class="right num">${num(r.base)}</td><td class="right num">${num(r.tax)}</td><td class="right num strong">${num(r.total)}</td><td class="small">${esc(r.delivery)}</td></tr>`).join('')}
          </tbody></table>
          <div class="callout callout-gold" style="margin-top:14px;">${svg('trophy', 16)}<div><b>Lowest evaluated: ${esc(rows[0].v.name)}</b>${pkr(rows[0].total)} including tax, ${esc(rows[0].delivery)} delivery.</div></div>`
      });
      this.logAudit('Comparative statement generated', `${D.rfq.id}: ${rows.length} quotations ranked.`, 'Bid Evaluation');
    },

    sourcingDocs() {
      const locked = this.poc.sbdLocked;
      setHTML('sourcing-body', `
        <div class="poc-grid-2-even" style="margin-bottom:0;">
          <div>
            <div class="panel-title">Standard bidding document repository</div>
            <table class="shad-table"><thead><tr><th>Template</th><th>Version</th><th>Updated</th></tr></thead><tbody>
              ${D.sbdTemplates.map(t => `<tr><td class="small strong">${esc(t.name)}</td><td>${badge('outline', t.version)}</td><td class="small nowrap">${esc(t.updated)}</td></tr>`).join('')}
            </tbody></table>
            <p class="small muted" style="margin-top:10px;">Tenders can only be issued from approved, version-controlled templates.</p>
          </div>
          <div>
            <div class="card-head-row" style="margin-bottom:10px;"><div><div class="panel-title" style="margin:0;">Committee review · SBD v4.2-PCB-089</div><div class="small muted">LED floodlights tender document</div></div>${locked ? badge('success', 'Final version locked', 'lock') : badge('warning', 'Under review', 'clock')}</div>
            <div class="thread">${D.sbdComments.map(c => `<div class="comment ${c.isNew ? '' : ''}"><div class="shad-avatar">${esc(c.by.split(' ').map(w => w[0]).join('').slice(0, 2))}</div><div><div class="comment-head"><b>${esc(c.by)}</b><span class="small muted">${esc(c.role)} · ${esc(c.at)}</span></div><div>${esc(c.text)}</div></div></div>`).join('')}</div>
            ${!locked ? `<div style="display:flex; gap:8px; margin-top:12px;"><input class="shad-input" id="sbd-comment" placeholder="Add a remark on this document"><button type="button" class="shad-btn shad-btn-outline" data-write onclick="app.addSbdComment()">Post</button></div>
              <button type="button" class="shad-btn shad-btn-default shad-btn-sm" style="margin-top:10px;" data-write onclick="app.lockSbd()">${svg('lock')}<span>Record sign-off and lock final version</span></button>` : ''}
          </div>
        </div>`);
    },

    addSbdComment() {
      const box = document.getElementById('sbd-comment');
      const text = box.value.trim();
      if (!text) { box.focus(); return; }
      const r = this.currentRole();
      D.sbdComments.push({ by: r.user, role: r.label, at: stamp(), text });
      this.renderSourcing();
    },

    lockSbd() {
      this.poc.sbdLocked = true;
      this.logAudit('Bidding document locked', 'SBD v4.2-PCB-089 signed off by the committee and locked.', 'Sourcing', 'Final version hash recorded. Further edits require a corrigendum.');
      this.renderSourcing();
    },

    sourcingGuarantees() {
      setHTML('sourcing-body', `
        <table class="shad-table"><thead><tr><th>Type</th><th>Bidder</th><th>Instrument</th><th class="right">Amount (PKR)</th><th>Valid until</th><th>Status</th><th></th></tr></thead><tbody>
          ${D.guarantees.map((g, i) => `<tr><td class="small strong">${esc(g.type)}</td><td class="small">${esc(g.bidder)}</td><td class="small mono">${esc(g.instrument)}</td><td class="right num">${num(g.amount)}</td><td class="small nowrap">${esc(g.validity)}</td>
            <td>${g.status === 'Held' ? badge('info', 'Held', 'lock') : g.status === 'Released' ? badge('success', 'Released', 'check') : badge('warning', g.status, 'clock')}</td>
            <td class="right">${g.status === 'Release on award' ? `<button type="button" class="shad-btn shad-btn-outline shad-btn-sm" data-write onclick="app.releaseGuarantee(${i})">Release</button>` : ''}</td></tr>`).join('')}
        </tbody></table>
        <p class="small muted" style="margin-top:10px;">Validity is monitored; reminders go out 30 days before expiry. Bid security is released after award, or forfeited on withdrawal.</p>`);
    },

    releaseGuarantee(i) {
      const g = D.guarantees[i];
      g.status = 'Released';
      this.logAudit('Bid security released', `${g.bidder}: ${g.instrument}.`, 'Sourcing');
      this.renderSourcing();
    },

    openEvaluationReport() {
      const t = D.tenders[this.currentTenderIndex] || D.tenders[0];
      const responsive = t.bidders.filter(b => b.techScore >= 70);
      this.openModal('ber-dialog', {
        title: `Bid evaluation report · ${t.tenderId}`,
        content: `<div class="doc-preview">
          <div class="doc-head"><div><h4>PAKISTAN CRICKET BOARD</h4><div class="muted">Procurement Committee · Bid Evaluation Report</div></div><div class="right"><div class="mono">${esc(t.tenderId)}</div><div class="muted">${esc(t.method)}</div></div></div>
          <div class="strong" style="margin-bottom:6px;">${esc(t.title)}</div>
          <div class="panel-title" style="margin-top:12px;">1. Technical evaluation (minimum 70)</div>
          <table class="shad-table"><thead><tr><th>Bidder</th><th class="right">Score</th><th>Result</th></tr></thead><tbody>
            ${t.bidders.map(b => `<tr><td>${esc(b.name)}</td><td class="right num">${b.techScore}</td><td>${b.techScore >= 70 ? badge('success', 'Qualified', 'check') : badge('destructive', 'Not qualified', 'x')}</td></tr>`).join('')}
          </tbody></table>
          <div class="panel-title" style="margin-top:14px;">2. Financial evaluation of qualified bidders</div>
          <div class="table-scroll"><table class="shad-table"><thead><tr><th>Rank</th><th>Bidder</th><th class="right">Evaluated total</th><th>Delivery</th><th>Warranty</th><th>Payment terms</th></tr></thead><tbody>
            ${responsive.map(b => { const tm = D.bidTerms[b.id] || {}; return `<tr class="${b.isWinner ? 'is-award' : ''}"><td>${b.isWinner ? badge('award', '#' + b.rank, 'trophy') : badge('outline', '#' + b.rank)}</td><td>${esc(b.name)}</td><td class="right num">${num(b.evaluatedTotalPkr)}</td><td class="small">${esc(tm.delivery)}</td><td class="small">${esc(tm.warranty)}</td><td class="small">${esc(tm.payment)}</td></tr>`; }).join('')}
          </tbody></table></div>
          <div class="callout callout-gold" style="margin-top:14px;">${svg('trophy', 16)}<div><b>Recommendation: ${esc((t.bidders.find(b => b.isWinner) || {}).name || '—')}</b>Lowest evaluated responsive bidder after applying sales tax to all bids. Delivery, warranty and payment terms are within the bidding document requirements.</div></div>
          <div class="panel-title" style="margin-top:14px;">3. Committee sign-off</div>
          <div class="poc-grid-3" style="grid-template-columns:repeat(2,minmax(0,1fr));">${t.committee.map(c => `<div class="panel"><div class="strong small">${esc(c.name)}</div><div class="small muted">${esc(c.role)}</div><div class="small t-success" style="margin-top:4px;">${svg('check', 11)} Signed · no conflict declared</div></div>`).join('')}</div>
        </div>`
      });
      const dlg = document.querySelector('#ber-dialog .shad-dialog');
      if (dlg) dlg.classList.add('is-wide');
    },

    /* ------------------------------------------------------------------
       DEMAND & INVENTORY (Modules 1 & 2)
       ------------------------------------------------------------------ */
    renderBranchCard() {
      const d = D.demands[0];
      const item = itemByCode(d.itemCode) || { name: d.itemCode, uom: 'units' };
      setHTML('branch-title', `<span>Stock-availability branching · ${esc(d.id)}</span>${badge('secondary', d.dept)}`);
      setHTML('branch-desc', `${esc(d.by)} requested ${d.qty} × ${esc(item.name)} for “${esc(d.purpose)}”. Required by ${esc(d.requiredBy)}.`);
      const tile = (kind, title, ref, head, text) => `<div class="panel" style="border-left:3px solid hsl(var(--${kind}));"><div class="card-head-row"><span class="shad-badge shad-badge-${kind === 'danger' ? 'destructive' : kind}">${title}</span><span class="mono small">${esc(ref || '')}</span></div><div class="strong" style="margin:8px 0 2px;">${head}</div><p class="small muted">${text}</p></div>`;
      let tiles = '';
      if (d.branch === 'full') tiles = tile('success', `✓ All ${d.qty} available`, d.sin, 'Issue request to Gaddafi Central Store', 'Fully in stock: issued and closed as fulfilled from stock. Still recorded and reportable.');
      if (d.branch === 'partial') tiles = tile('success', `✓ ${d.issued} issued from stock`, d.sin, 'Gaddafi Stadium Central Store', 'Stock reserved against this demand so it cannot be promised twice.') + tile('warning', `⚠ ${d.prQty} short`, d.pr, 'Purchase requisition to Procurement', 'Balance raised automatically under the same demand number and Item Code.');
      if (d.branch === 'none') tiles = tile('danger', `✕ Not in stock`, d.pr, 'Full quantity routed to Procurement', 'Purchase requisition raised for approval and sourcing.');
      setHTML('branch-body', `<div style="display:grid; grid-template-columns:repeat(${d.branch === 'partial' ? 2 : 1}, minmax(0,1fr)); gap:16px;">${tiles}</div>
        <div class="stepper" style="margin-top:14px;">${['Raised', 'Stock checked', d.branch === 'none' ? 'PR raised' : 'Issued / reserved', 'Approval', 'Delivered'].map((s, i) => { const at = d.status.startsWith('Fulfilled') ? 5 : d.status.includes('approved') ? 4 : 3; return `<span class="step ${i < at ? 'is-done' : i === at ? 'is-now' : ''}"><i>${i < at ? '✓' : i + 1}</i>${s}</span>`; }).join('')}</div>`);
    },

    renderDemands() {
      this.renderBranchCard();
      setHTML('demand-tbody', D.demands.map(d => {
        const item = itemByCode(d.itemCode);
        const st = d.status.startsWith('Fulfilled') ? badge('success', d.status, 'check') : d.status.includes('approved') || d.status.includes('evaluation') ? badge('info', d.status, 'clock') : badge('warning', d.status, 'clock');
        return `<tr class="${d.isNew ? 'is-new' : ''}">
          <td><div class="mono small strong">${esc(d.id)}</div><div class="sub">${esc(d.date)}</div></td>
          <td><div class="small strong">${esc(d.dept)}</div><div class="sub">${esc(d.by)}</div></td>
          <td><div class="small">${esc(item ? item.name.slice(0, 40) : d.itemCode)}</div><div class="sub mono">${esc(d.itemCode)} · qty ${d.qty}</div></td>
          <td><div class="chip-row">${d.issued ? badge('success', `${d.issued} issued`) : ''}${d.prQty ? badge('warning', `${d.prQty} to PR`) : ''}</div><div class="sub mono">${esc([d.sin, d.pr].filter(Boolean).join(' · '))}</div></td>
          <td class="small nowrap">${esc(d.requiredBy)}</td>
          <td>${st}</td>
        </tr>`;
      }).join(''));
      D.demands.forEach(d => delete d.isNew);
    },

    renderInventory(filterTerm = '') {
      const tbody = document.getElementById('inventory-tbody');
      if (!tbody) return;
      let items = D.itemsMaster;
      if (this.activeStoreFilter !== 'all') items = items.filter(i => i.storeBreakdown && i.storeBreakdown[this.activeStoreFilter] !== undefined);
      if (filterTerm) { const t = filterTerm.toLowerCase(); items = items.filter(i => i.name.toLowerCase().includes(t) || i.code.toLowerCase().includes(t)); }
      tbody.innerHTML = items.map(i => {
        const storeStock = this.activeStoreFilter !== 'all' ? i.storeBreakdown[this.activeStoreFilter] : i.storeBreakdown['STORE-LHR-01'];
        const low = i.totalStock <= i.reorderLevel;
        return `<tr onclick="app.inspectItem('${i.code}')" title="View stock distribution and movements">
          <td><span class="mono small">${i.code}</span></td>
          <td><div class="strong">${esc(i.name)}</div><div class="sub">${esc(i.spec)}</div></td>
          <td><div class="chip-row">${badge(i.budgetType === 'CapEx' ? 'outline' : 'secondary', i.budgetType)}${badge('secondary', i.classification.includes('Asset') ? 'Asset' : 'Consumable')}</div></td>
          <td class="small">${esc(i.uom)}</td>
          <td class="right num strong">${i.totalStock}</td>
          <td class="right num t-primary strong">${storeStock}</td>
          <td>${low ? badge('warning', `Re-order (≤ ${i.reorderLevel})`, 'alert') : `<span class="small muted num">${i.reorderLevel}</span>`}</td>
          <td class="right num">${num(i.avgCostPkr)}</td>
          <td><button type="button" class="shad-btn shad-btn-outline shad-btn-sm" onclick="event.stopPropagation(); app.previewItemLabel('${i.code}', '')">QR tag</button></td>
        </tr>`;
      }).join('') || `<tr><td colspan="9"><div class="empty">No items match.</div></td></tr>`;
    },

    inspectItem(code) {
      const item = itemByCode(code);
      if (!item) return;
      const all = this.ledgerCompute(code, new Date(2026, 6, 1), new Date(2100, 0, 1));
      const grns = all ? all.rows.filter(e => e.type === 'GRN') : [];
      const last = grns[grns.length - 1];
      const recent = all ? all.rows.slice(-6).reverse() : [];
      const asset = D.assetAttributes[code];
      this.openModal('item-drawer-dialog', {
        title: `${item.code} · ${item.name}`,
        content: `
          <div class="chip-row" style="margin-bottom:14px;">${badge('outline', item.budgetType)}${badge('secondary', item.classification)}${badge('secondary', item.category)}${item.totalStock <= item.reorderLevel ? badge('warning', 'At re-order level', 'alert') : ''}</div>
          <div class="poc-grid-3" style="grid-template-columns:repeat(3,minmax(0,1fr)); margin-bottom:14px;">
            <div class="panel"><div class="panel-title">Last purchase</div><div class="strong num">${last ? pkr(last.unitCost) : '—'}</div><div class="small muted">${last ? `${esc(last.date)} · ${esc(last.party)}` : 'No receipts this FY'}</div></div>
            <div class="panel"><div class="panel-title">Weighted average cost</div><div class="strong num">${pkr(all ? all.close.wac : item.avgCostPkr)}</div><div class="small muted">Updated on each GRN</div></div>
            <div class="panel"><div class="panel-title">${asset ? 'Asset attributes' : 'Shelf life'}</div>${asset ? `<div class="small">Warranty ${esc(asset.warranty)} · life ${esc(asset.usefulLife)}</div><div class="small muted">${esc(asset.depreciation)}</div>` : `<div class="strong">${esc(item.shelfLife)}</div>`}</div>
          </div>
          <div class="panel-title">Stock by store</div>
          <div class="poc-grid-3" style="grid-template-columns:repeat(5,minmax(0,1fr)); margin-bottom:14px;">
            ${D.stadiumStores.map(s => `<div class="panel" style="padding:10px;"><div class="small muted" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(s.name.replace(' Stadium', '').replace(' Central Store', ''))}</div><div class="strong num" style="font-size:16px;">${item.storeBreakdown[s.id] ?? 0}</div></div>`).join('')}
          </div>
          <div class="panel-title">Recent movements, Gaddafi Central</div>
          <table class="shad-table"><thead><tr><th>Date</th><th>Document</th><th>Type</th><th>Party</th><th class="right">Qty</th><th class="right">Balance</th></tr></thead><tbody>
            ${recent.map(e => `<tr><td class="small nowrap">${esc(e.date)}</td><td class="mono small">${esc(e.ref)}</td><td>${badge(TYPE_KIND[e.type], TYPE_LABEL[e.type])}</td><td class="small">${esc(e.party)}</td><td class="right num ${e.qty > 0 ? 't-success' : ''}">${e.qty > 0 ? '+' : ''}${e.qty}</td><td class="right num strong">${e.balance}</td></tr>`).join('') || '<tr><td colspan="6"><div class="empty">No movements recorded.</div></td></tr>'}
          </tbody></table>
          <div style="display:flex; gap:8px; margin-top:16px; flex-wrap:wrap;">
            <button type="button" class="shad-btn shad-btn-default" data-write onclick="app.closeDialog('item-drawer-dialog'); app.openNewDemandModal('${code}');">Raise demand for this item</button>
            <button type="button" class="shad-btn shad-btn-outline" onclick="app.closeDialog('item-drawer-dialog'); app.poc.ledgerItem='${code}'; app.poc.reportType='ledger'; app.showTab('reports');">${svg('chart')}<span>Full item ledger</span></button>
            <button type="button" class="shad-btn shad-btn-outline" data-write onclick="app.closeDialog('item-drawer-dialog'); app.openStockTransfer('${code}')">Transfer between stores</button>
          </div>`
      });
      const dlg = document.querySelector('#item-drawer-dialog .shad-dialog');
      if (dlg) dlg.classList.add('is-wide');
    },

    previewItemLabel(code) {
      this.toast('Label sent to printer', `Barcode and QR label for ${code} queued on Zebra ZD621.`);
    },

    openStockTransfer(code) {
      const opts = D.itemsMaster.map(i => `<option value="${i.code}" ${i.code === code ? 'selected' : ''}>${i.code} · ${esc(i.name.slice(0, 40))}</option>`).join('');
      const stores = D.stadiumStores.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
      this.openModal('transfer-dialog', { footer: false,
        title: 'Transfer stock between stores',
        content: `<div class="form-grid">
            <div class="span-2"><label class="shad-label" for="trf-item">Item</label><select class="shad-select" id="trf-item">${opts}</select></div>
            <div><label class="shad-label" for="trf-from">From store</label><select class="shad-select" id="trf-from">${stores}</select></div>
            <div><label class="shad-label" for="trf-to">To store</label><select class="shad-select" id="trf-to">${stores.replace('value="STORE-KHI-01"', 'value="STORE-KHI-01" selected')}</select></div>
            <div><label class="shad-label" for="trf-qty">Quantity</label><input class="shad-input" id="trf-qty" type="number" min="1" value="5"></div>
            <div><label class="shad-label" for="trf-reason">Reason</label><input class="shad-input" id="trf-reason" value="Match-day allocation"></div>
          </div>
          <div class="small t-danger" id="trf-err" style="display:none; margin-top:8px;"></div>
          <p class="small muted" style="margin-top:10px;">Transfers need the receiving custodian's confirmation and are traceable by Item Code.</p>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;"><button type="button" class="shad-btn shad-btn-outline" onclick="app.closeDialog('transfer-dialog')">Cancel</button><button type="button" class="shad-btn shad-btn-default" onclick="app.saveStockTransfer()">Authorise transfer</button></div>`
      });
    },

    saveStockTransfer() {
      const code = document.getElementById('trf-item').value;
      const from = document.getElementById('trf-from').value, to = document.getElementById('trf-to').value;
      const qty = parseInt(document.getElementById('trf-qty').value, 10) || 0;
      const err = document.getElementById('trf-err');
      const item = itemByCode(code);
      const avail = item.storeBreakdown[from] || 0;
      if (from === to) { err.textContent = 'Choose two different stores.'; err.style.display = 'block'; return; }
      if (qty < 1 || qty > avail) { err.textContent = `Enter a quantity between 1 and ${avail} (available at ${storeName(from)}).`; err.style.display = 'block'; return; }
      item.storeBreakdown[from] -= qty;
      item.storeBreakdown[to] = (item.storeBreakdown[to] || 0) + qty;
      if (from === 'STORE-LHR-01') item.centralStock -= qty;
      if (to === 'STORE-LHR-01') item.centralStock += qty;
      const ref = `TRF-2026-00${this.poc.trfSeq++}`;
      const L = D.itemLedgers[code];
      if (L && (from === 'STORE-LHR-01' || to === 'STORE-LHR-01')) L.entries.push({ date: D.today, type: from === 'STORE-LHR-01' ? 'TRANSFER_OUT' : 'TRANSFER_IN', ref, doc: from === 'STORE-LHR-01' ? `To ${to}` : `From ${from}`, qty: from === 'STORE-LHR-01' ? -qty : qty, party: storeName(from === 'STORE-LHR-01' ? to : from), purpose: document.getElementById('trf-reason').value });
      this.closeDialog('transfer-dialog');
      this.logAudit('Stock transferred', `${ref}: ${qty} × ${code} from ${storeName(from)} to ${storeName(to)}.`, 'Inventory');
      this.toast('Transfer authorised', `${ref} awaiting receipt confirmation at ${storeName(to)}.`);
      this.renderInventory();
      this.renderInventoryCharts();
    },

    renderStockTake() {
      const st = D.stockTake;
      const lines = st.lines.map(l => ({ ...l, item: itemByCode(l.code), variance: l.counted - l.book }));
      const varValue = lines.reduce((a, l) => a + l.variance * l.item.avgCostPkr, 0);
      setHTML('stocktake', `
        ${cardHead(`Physical stock-take · ${esc(st.id)}`, `${esc(st.store)} · counted ${esc(st.date)} by ${esc(st.countedBy)}`, st.status === 'Approved' ? badge('success', 'Adjustments approved', 'check') : badge('warning', st.status, 'clock'))}
        <div class="shad-card-content table-scroll" style="padding:0;">
          <table class="shad-table"><thead><tr><th>Item</th><th class="right">Book</th><th class="right">Counted</th><th class="right">Variance</th><th class="right">Value (PKR)</th></tr></thead><tbody>
            ${lines.map(l => `<tr><td><div class="small strong">${esc(l.item.name.slice(0, 46))}</div><div class="sub mono">${l.code}</div></td><td class="right num">${l.book}</td><td class="right num">${l.counted}</td><td class="right num ${l.variance ? 't-danger strong' : 'muted'}">${l.variance > 0 ? '+' : ''}${l.variance}</td><td class="right num ${l.variance ? 't-danger' : 'muted'}">${l.variance ? num(l.variance * l.item.avgCostPkr) : '0'}</td></tr>`).join('')}
          </tbody></table>
        </div>
        <div class="shad-card-footer"><span class="small muted" style="margin-right:auto;">Net variance <b class="${varValue ? 't-danger' : ''}">${pkr(varValue)}</b> · adjustments post only after approval</span>
          ${st.status !== 'Approved' ? `<button type="button" class="shad-btn shad-btn-default shad-btn-sm" data-write onclick="app.approveStockTake()">Approve adjustments</button>` : ''}</div>`);
    },

    approveStockTake() {
      const st = D.stockTake;
      st.lines.filter(l => l.counted !== l.book).forEach(l => {
        const item = itemByCode(l.code), v = l.counted - l.book;
        item.totalStock += v; item.centralStock += v; item.storeBreakdown['STORE-LHR-01'] += v;
        const L = D.itemLedgers[l.code];
        if (L) L.entries.push({ date: D.today, type: 'ADJUST', ref: st.id, doc: 'Stock-take variance', qty: v, party: 'Gaddafi Central Store', purpose: 'Approved stock-take adjustment' });
        l.book = l.counted;
      });
      st.status = 'Approved';
      this.logAudit('Stock-take adjustment approved', `${st.id}: variance posted to the ledger.`, 'Inventory', 'Adjustment posted as a separate ledger entry; original records unchanged.');
      this.renderStockTake();
      this.renderInventory();
      this.renderOverviewPoc();
    },

    renderInventoryCharts() {
      const v = document.getElementById('inv-value-chart');
      if (v) C.line(v, { labels: D.analytics.months, height: 200, series: [{ name: 'Stock value', color: '--chart-1', values: D.analytics.stockValue, area: true }], fmt: x => `${x}`, tipFmt: x => `PKR ${x.toFixed(1)}M`, tipTitle: i => D.analytics.monthLabels[i] });
      const s = document.getElementById('inv-store-chart');
      if (s) C.hbars(s, D.stadiumStores.map(x => ({ name: x.name.replace(' Stadium', '').replace(' Central Store', ''), value: x.valuationPkr / 1e6 })), { fmt: x => `${x.toFixed(1)}M`, onClick: i => this.filterStoreTab(D.stadiumStores[i].id) });
    },

    /* Indent dialog (FR-1.1 – 1.8) */
    openNewDemandModal(code) {
      const r = this.currentRole();
      setHTML('ind-item', D.itemsMaster.map(i => `<option value="${i.code}" ${i.code === code ? 'selected' : ''}>${i.code} · ${esc(i.name.slice(0, 50))}</option>`).join(''));
      setHTML('ind-budget', D.budgetHeads.map(b => `<option value="${b.id}">${esc(b.name)}</option>`).join(''));
      setHTML('ind-by', `Requested by <b>${esc(r.user)}</b> · ${esc(r.label)}`);
      const item = itemByCode(document.getElementById('ind-item').value);
      document.getElementById('ind-budget').value = item.budgetType === 'CapEx' ? (item.code.includes('BRD') ? 'BH-CAP-BRD' : 'BH-CAP-INF') : 'BH-OPX-HPC';
      document.getElementById('new-demand-dialog').classList.add('active');
      this.updateIndentPreview();
    },

    onIndentItemChange() {
      const item = itemByCode(document.getElementById('ind-item').value);
      document.getElementById('ind-budget').value = item.budgetType === 'CapEx' ? (item.code.includes('BRD') ? 'BH-CAP-BRD' : 'BH-CAP-INF') : 'BH-OPX-HPC';
      this.updateIndentPreview();
    },

    indentPlan() {
      const item = itemByCode(document.getElementById('ind-item').value);
      const qty = Math.max(0, parseInt(document.getElementById('ind-qty').value, 10) || 0);
      const head = headById(document.getElementById('ind-budget').value);
      const avail = item.storeBreakdown['STORE-LHR-01'] || 0;
      const issue = Math.min(avail, qty), pr = qty - issue;
      const prValue = pr * item.avgCostPkr;
      const headAvail = head.allocation - head.committed;
      return { item, qty, head, avail, issue, pr, prValue, headAvail, branch: qty === 0 ? 'none' : pr === 0 ? 'full' : issue === 0 ? 'none' : 'partial', typeMismatch: head.type !== item.budgetType, overBudget: prValue > headAvail };
    },

    updateIndentPreview() {
      const p = this.indentPlan();
      let html = '';
      if (!p.qty) html = `<div class="callout callout-info">${svg('info', 16)}<div>Enter a quantity to check stock.</div></div>`;
      else if (p.branch === 'full') html = `<div class="callout callout-success">${svg('check', 16)}<div><b>Fully in stock: ${p.qty} of ${p.avail} available</b>Issue request goes to Gaddafi Central Store and the quantity is reserved immediately. The demand closes as fulfilled from stock.</div></div>`;
      else if (p.branch === 'partial') html = `<div class="callout callout-warning">${svg('alert', 16)}<div><b>Partly in stock: ${p.issue} issued, ${p.pr} to Procurement</b>${p.issue} reserved and issued from Gaddafi Central. A purchase requisition for ${p.pr} (≈ ${pkr(p.prValue)}) is raised under the same demand number and Item Code.</div></div>`;
      else html = `<div class="callout callout-danger">${svg('x', 16)}<div><b>Not in stock</b>The full ${p.qty} is routed to Procurement as a purchase requisition (≈ ${pkr(p.prValue)}).</div></div>`;
      if (p.qty && p.pr) {
        html += p.overBudget
          ? `<div class="callout callout-danger" style="margin-top:8px;">${svg('wallet', 16)}<div><b>Insufficient budget on ${esc(p.head.name)}</b>Needs ${pkr(p.prValue)}; ${pkr(p.headAvail)} uncommitted. Reduce the quantity or choose another head.</div></div>`
          : `<div class="small muted" style="margin-top:8px;">${svg('wallet', 11)} Budget check passed: ${pkr(p.headAvail)} uncommitted on ${esc(p.head.name)}.</div>`;
      }
      if (p.typeMismatch) html += `<div class="small t-warning" style="margin-top:6px;">${svg('alert', 11)} This item is ${p.item.budgetType}; the selected head is ${p.head.type}.</div>`;
      setHTML('ind-preview', html);
      const btn = document.getElementById('ind-submit');
      if (btn) btn.disabled = !p.qty || (p.pr && p.overBudget) || !document.getElementById('ind-purpose').value.trim();
    },

    submitIndent() {
      const p = this.indentPlan();
      if (!p.qty) return;
      const r = this.currentRole();
      const id = `REQ-2026-${this.poc.demandSeq++}`;
      const sin = p.issue ? `SIN-LHR-${this.poc.sinSeq++}` : null;
      const pr = p.pr ? `PR-AUTO-${this.poc.prSeq++}` : null;
      const dept = document.getElementById('ind-dept').value;
      const purpose = document.getElementById('ind-purpose').value.trim();
      const reqDate = document.getElementById('ind-date').value;
      const requiredBy = reqDate ? fmtD(new Date(reqDate)) : '—';
      if (p.issue) {
        p.item.storeBreakdown['STORE-LHR-01'] -= p.issue; p.item.centralStock -= p.issue; p.item.totalStock -= p.issue;
        const L = D.itemLedgers[p.item.code];
        if (L) L.entries.push({ date: D.today, type: 'ISSUE', ref: sin, doc: id, qty: -p.issue, party: dept, custodian: 'Departmental custodian', recipient: r.user, purpose });
      }
      D.demands.unshift({ id, date: D.today, dept, by: r.user, itemCode: p.item.code, qty: p.qty, issued: p.issue, prQty: p.pr, branch: p.branch, sin, pr, requiredBy, purpose, budgetHead: p.head.id, status: p.pr ? 'PR in approval' : 'Fulfilled from stock', isNew: true });
      if (p.pr) {
        const band = p.prValue <= 100000 ? 'B1' : p.prValue <= 3000000 ? 'B2' : p.prValue <= 20000000 ? 'B3' : p.prValue <= 50000000 ? 'B4' : 'B5';
        D.approvals.unshift({ id: `APR-2026-0${this.poc.aprSeq++}`, type: 'Purchase Requisition', ref: pr, title: `${p.pr} × ${p.item.name.slice(0, 50)}`, amount: p.prValue, band, dept, requestedBy: r.user, submitted: D.today, slaHours: 48, elapsedHours: 0, status: 'pending', demandId: id, isNew: true,
          chain: [{ role: 'Head of Department', name: 'Department head', status: 'approved', at: stamp(), remark: purpose }, { role: 'Director Procurement', name: 'Usman Zafar', status: 'pending', roleKey: 'director' }].concat(['B3', 'B4', 'B5'].includes(band) ? [{ role: 'CFO', name: 'Tariq Mehmood', status: 'waiting', roleKey: 'cfo' }] : []) });
      }
      this.closeDialog('new-demand-dialog');
      this.logAudit('Demand raised', `${id}: ${p.qty} × ${p.item.code}${p.issue ? `, ${p.issue} issued (${sin})` : ''}${p.pr ? `, ${p.pr} to ${pr}` : ''}.`, 'Auto Branching', `Budget head ${p.head.name}. Purpose: ${purpose}.`);
      this.toast('Demand submitted', `${id}${sin ? ` · ${sin} issued` : ''}${pr ? ` · ${pr} sent for approval` : ''}`);
      this.showTab('inventory');
      this.renderDemands();
      this.renderInventory();
      this.renderApprovalsAll();
      this.renderOverviewPoc();
    },

    /* ------------------------------------------------------------------
       CUSTODY (Module 3)
       ------------------------------------------------------------------ */
    lifecycleBadge(s) {
      return ({ 'Issued': badge('info', 'Issued', 'mail'), 'In Use': badge('success', 'In use', 'check'), 'Returned': badge('secondary', 'Returned', 'undo'), 'Under Repair': badge('warning', 'Under repair', 'alert'), 'Disposed': badge('destructive', 'Disposed', 'x') })[s] || badge('secondary', s);
    },

    custodianFor(dept) { return (D.departmentCustodians.find(d => d.dept === dept) || {}).custodian || '—'; },

    renderCustody() {
      const holder = D.custodyHolders.find(h => h.empId === this.activePlayerId) || D.custodyHolders[0];
      const value = holder.assets.reduce((a, x) => a + x.valuePkr, 0);
      const held = holder.assets.filter(a => !['Returned', 'Disposed'].includes((D.custodyMeta[a.assetTag] || {}).lifecycle));
      setHTML('custody-player-name', `${esc(holder.name)} · ${esc(holder.empId)}`);
      setHTML('custody-player-role', `${esc(holder.designation)} · ${esc(holder.department)} · departmental custodian ${esc(this.custodianFor(holder.department))}`);
      setHTML('custody-player-count', `${held.length} items held`);
      setHTML('custody-player-value', `Valuation ${pkr(value)}`);
      const av = document.getElementById('custody-player-avatar');
      if (av) av.textContent = holder.name.split(' ').map(w => w[0]).join('').slice(0, 2);
      setHTML('custody-player-assets-row', holder.assets.map(a => {
        const m = D.custodyMeta[a.assetTag] || {};
        return `<div class="panel" style="cursor:pointer;" onclick="app.openAsset('${a.assetTag}')" title="Manage lifecycle">
          <div class="card-head-row"><span class="mono small strong">${esc(a.assetTag)}</span>${this.lifecycleBadge(m.lifecycle)}</div>
          <div class="small" style="margin-top:6px;">${esc(a.description)}</div>
          <div class="sub" style="margin-top:4px;">${esc(m.purpose || '')} · ${esc(m.location || '')}</div>
          ${m.ack === 'Pending' ? `<div style="margin-top:6px;">${badge('warning', 'Awaiting confirmation', 'clock')}</div>` : ''}
        </div>`;
      }).join(''));

      const rows = [];
      D.custodyHolders.forEach(h => h.assets.forEach(a => rows.push({ ...a, holder: h.name, dept: h.department, empId: h.empId, m: D.custodyMeta[a.assetTag] || {} })));
      setHTML('custody-tbody', rows.map(r => `<tr class="${r.empId === holder.empId ? 'is-selected' : ''}" onclick="app.switchPlayer('${r.empId}')">
        <td class="mono small strong">${esc(r.assetTag)}</td>
        <td><div class="strong small">${esc(r.description)}</div><div class="sub mono">${esc(r.itemCode)}</div></td>
        <td><div class="small"><span class="muted">Store →</span> ${esc(this.custodianFor(r.dept))} <span class="muted">→</span> <b>${esc(r.holder)}</b></div><div class="sub">${esc(r.dept)}</div></td>
        <td><div class="small">${esc(r.m.purpose || '—')}</div><div class="sub">${esc(r.m.location || '')}</div></td>
        <td class="small nowrap">${esc(r.issuedDate)}<div class="sub">${r.m.returnable ? `Return by ${esc(r.m.expectedReturn)}` : 'Non-returnable'}</div></td>
        <td class="right num">${num(r.valuePkr)}</td>
        <td>${this.lifecycleBadge(r.m.lifecycle)}</td>
        <td>${r.m.ack === 'Pending' ? (r.m.ackHours >= D.ackEscalationHours ? badge('destructive', `Escalated · ${r.m.ackHours}h`, 'alert') : badge('warning', `Pending · ${r.m.ackHours}h`, 'clock')) : badge('success', 'Confirmed', 'check')}</td>
      </tr>`).join(''));
      this.renderCustodyChain();
      this.renderAcks();
    },

    switchPlayer(empId) {
      this.activePlayerId = empId;
      this.renderCustody();
    },

    renderCustodyChain() {
      setHTML('custody-chain', `
        <div class="stepper" style="margin-bottom:16px;">
          <span class="step is-done"><i>1</i>Central Store · Muhammad Rashid</span><span class="step-sep"></span>
          <span class="step is-done"><i>2</i>Departmental custodian</span><span class="step-sep"></span>
          <span class="step is-now"><i>3</i>Employee / holder (confirms receipt)</span>
        </div>
        <div class="poc-grid-3" style="grid-template-columns:repeat(4,minmax(0,1fr));">
          ${D.departmentCustodians.map(d => `<div class="panel"><div class="panel-title">${esc(d.dept)}</div><div class="strong">${esc(d.custodian)}</div><div class="small muted">${d.holders} holder${d.holders === 1 ? '' : 's'} · ${d.items} items on ledger</div></div>`).join('')}
        </div>`);
    },

    renderAcks() {
      const pending = [];
      D.custodyHolders.forEach(h => h.assets.forEach(a => { const m = D.custodyMeta[a.assetTag]; if (m && m.ack === 'Pending') pending.push({ a, h, m }); }));
      setHTML('custody-acks-count', `${pending.length} pending`);
      setHTML('custody-acks', pending.length ? `<div class="worklist">${pending.map(({ a, h, m }) => {
        const esc8 = m.ackHours >= D.ackEscalationHours;
        return `<div class="work-item" style="cursor:default;">
          <div class="work-title">${esc(h.name)} · <span class="mono small">${esc(a.assetTag)}</span></div>
          ${esc8 ? badge('destructive', 'Escalated', 'alert') : badge('warning', `${m.ackHours}h`, 'clock')}
          <div class="work-meta">${esc(a.description)} · issued ${esc(a.issuedDate)}${esc8 ? ` · escalated to ${esc(this.custodianFor(h.department))}` : ''}</div>
          <div class="bar ${esc8 ? 'is-danger' : 'is-warning'}"><i style="width:${Math.min(100, (m.ackHours / D.ackEscalationHours) * 100)}%"></i></div>
          <div style="grid-column:1 / -1; display:flex; gap:6px; margin-top:6px;">
            <button type="button" class="shad-btn shad-btn-outline shad-btn-sm" data-write onclick="app.toast('Reminder sent', 'Email and in-app reminder sent to ${esc(h.name)}.')">${svg('mail')}<span>Remind</span></button>
            <button type="button" class="shad-btn shad-btn-ghost shad-btn-sm" data-write onclick="app.confirmCustody('${a.assetTag}')">Record confirmation (demo)</button>
          </div>
        </div>`;
      }).join('')}</div>` : `<div class="empty">${svg('check', 18)}<div style="margin-top:6px;">Every recipient has confirmed.</div></div>`);
    },

    confirmCustody(tag) {
      const m = D.custodyMeta[tag];
      m.ack = 'Confirmed'; m.lifecycle = 'In Use';
      this.logAudit('Custody confirmed', `${tag} acknowledged by the recipient.`, 'Custody Chain', 'Confirmed in app with one-time code. Custody now rests with the employee.');
      this.renderCustody();
      this.renderOverviewPoc();
    },

    openAsset(tag) {
      let holder, asset;
      D.custodyHolders.forEach(h => h.assets.forEach(a => { if (a.assetTag === tag) { holder = h; asset = a; } }));
      const m = D.custodyMeta[tag];
      const at = LIFECYCLE.indexOf(m.lifecycle);
      this.openModal('asset-dialog', {
        title: `${tag} · ${asset.description}`,
        content: `<div class="stepper" style="margin-bottom:14px;">${LIFECYCLE.map((s, i) => `<span class="step ${i < at ? 'is-done' : i === at ? 'is-now' : ''}"><i>${i < at ? '✓' : i + 1}</i>${s}</span>`).join('')}</div>
          <dl class="kv"><dt>Holder</dt><dd>${esc(holder.name)} (${esc(holder.empId)})</dd><dt>Custody chain</dt><dd>Central Store → ${esc(this.custodianFor(holder.department))} → ${esc(holder.name)}</dd>
          <dt>Purpose</dt><dd>${esc(m.purpose)}</dd><dt>Location</dt><dd>${esc(m.location)}</dd><dt>Expected return</dt><dd>${m.returnable ? esc(m.expectedReturn) : 'Non-returnable'}</dd><dt>Item code</dt><dd class="mono">${esc(asset.itemCode)}</dd><dt>Value</dt><dd class="num">${pkr(asset.valuePkr)}</dd></dl>
          <div class="divider"></div>
          <div class="panel-title">Update status</div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            ${['In Use', 'Returned', 'Under Repair', 'Disposed'].filter(s => s !== m.lifecycle).map(s => `<button type="button" class="shad-btn ${s === 'Disposed' ? 'shad-btn-danger' : 'shad-btn-outline'} shad-btn-sm" data-write onclick="app.setLifecycle('${tag}', '${s}')">${s === 'In Use' ? 'Back in use' : s === 'Returned' ? 'Mark returned to store' : s === 'Under Repair' ? 'Send for repair' : 'Dispose / write off'}</button>`).join('')}
          </div>`
      });
    },

    setLifecycle(tag, s) {
      D.custodyMeta[tag].lifecycle = s;
      this.closeDialog('asset-dialog');
      this.logAudit('Asset status changed', `${tag}: ${s}.`, 'Custody Chain', s === 'Disposed' ? 'Disposal requires survey approval; asset removed from the register with history retained.' : '');
      this.renderCustody();
    },

    openTransferAsset() {
      const assets = []; D.custodyHolders.forEach(h => h.assets.forEach(a => assets.push({ a, h })));
      this.openModal('custody-transfer-dialog', { footer: false,
        title: 'Hand over custody',
        content: `<div class="form-grid">
            <div class="span-2"><label class="shad-label" for="ct-asset">Asset</label><select class="shad-select" id="ct-asset">${assets.map(({ a, h }) => `<option value="${a.assetTag}">${a.assetTag} · ${esc(a.description.slice(0, 40))} (${esc(h.name)})</option>`).join('')}</select></div>
            <div class="span-2"><label class="shad-label" for="ct-to">New holder</label><select class="shad-select" id="ct-to">${D.custodyHolders.map(h => `<option value="${h.empId}">${esc(h.name)} · ${esc(h.department)}</option>`).join('')}</select></div>
            <div><label class="shad-label" for="ct-purpose">Purpose</label><input class="shad-input" id="ct-purpose" value="Series video analysis"></div>
            <div><label class="shad-label" for="ct-return">Expected return</label><input class="shad-input" id="ct-return" type="date" value="2026-12-31"></div>
          </div>
          <p class="small muted" style="margin-top:10px;">The new holder is notified and must confirm receipt. Unconfirmed handovers escalate to the departmental custodian after ${D.ackEscalationHours} hours.</p>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;"><button type="button" class="shad-btn shad-btn-outline" onclick="app.closeDialog('custody-transfer-dialog')">Cancel</button><button type="button" class="shad-btn shad-btn-default" onclick="app.saveTransferAsset()">Hand over</button></div>`
      });
    },

    saveTransferAsset() {
      const tag = document.getElementById('ct-asset').value;
      const toId = document.getElementById('ct-to').value;
      const from = D.custodyHolders.find(h => h.assets.some(a => a.assetTag === tag));
      const to = D.custodyHolders.find(h => h.empId === toId);
      if (from === to) { this.closeDialog('custody-transfer-dialog'); return; }
      const idx = from.assets.findIndex(a => a.assetTag === tag);
      const [asset] = from.assets.splice(idx, 1);
      asset.issuedDate = D.today;
      to.assets.push(asset);
      from.activeAssetsCount = from.assets.length; to.activeAssetsCount = to.assets.length;
      const ret = document.getElementById('ct-return').value;
      Object.assign(D.custodyMeta[tag], { purpose: document.getElementById('ct-purpose').value, expectedReturn: ret ? fmtD(new Date(ret)) : '—', returnable: !!ret, lifecycle: 'Issued', ack: 'Pending', ackHours: 0 });
      this.closeDialog('custody-transfer-dialog');
      this.logAudit('Custody handed over', `${tag}: ${from.name} → ${to.name}.`, 'Custody Chain', 'Awaiting recipient confirmation.');
      this.toast('Handover recorded', `${to.name} has been asked to confirm receipt.`);
      this.activePlayerId = to.empId;
      this.renderCustody();
    },

    generateExitClearance() {
      const holder = D.custodyHolders.find(h => h.empId === this.activePlayerId) || D.custodyHolders[0];
      const outstanding = holder.assets.filter(a => { const m = D.custodyMeta[a.assetTag] || {}; return m.returnable && !['Returned', 'Disposed'].includes(m.lifecycle); });
      const nonRet = holder.assets.filter(a => !(D.custodyMeta[a.assetTag] || {}).returnable);
      const clear = outstanding.length === 0;
      this.openModal('noc-dialog', {
        title: 'Outstanding custody report · exit clearance',
        content: `<div class="doc-preview">
          <div class="doc-head"><div><h4>PAKISTAN CRICKET BOARD</h4><div class="muted">Stores &amp; Custody Wing · Gaddafi Stadium, Lahore</div></div><div class="right"><div class="strong">EXIT CLEARANCE</div><div class="muted">${esc(D.today)}</div></div></div>
          <dl class="kv" style="margin-bottom:12px;"><dt>Employee</dt><dd>${esc(holder.name)} (${esc(holder.empId)})</dd><dt>Department</dt><dd>${esc(holder.department)}</dd><dt>Departmental custodian</dt><dd>${esc(this.custodianFor(holder.department))}</dd></dl>
          ${clear ? `<div class="callout callout-success">${svg('check', 16)}<div><b>Cleared</b>No returnable assets outstanding. NOC can be issued.</div></div>`
            : `<div class="callout callout-danger">${svg('lock', 16)}<div><b>Clearance blocked: ${outstanding.length} returnable item${outstanding.length === 1 ? '' : 's'} outstanding</b>Items must be returned to store, or written off with approval, before the NOC is issued.</div></div>`}
          <table class="shad-table" style="margin-top:12px;"><thead><tr><th>Asset tag</th><th>Description</th><th>Status</th><th class="right">Value (PKR)</th></tr></thead><tbody>
            ${outstanding.map(a => `<tr><td class="mono small">${esc(a.assetTag)}</td><td class="small">${esc(a.description)}</td><td>${this.lifecycleBadge(D.custodyMeta[a.assetTag].lifecycle)}</td><td class="right num">${num(a.valuePkr)}</td></tr>`).join('') || '<tr><td colspan="4"><div class="empty">Nothing outstanding.</div></td></tr>'}
          </tbody></table>
          ${nonRet.length ? `<p class="small muted" style="margin-top:10px;">Non-returnable items issued (no recovery): ${nonRet.map(a => esc(a.assetTag)).join(', ')}.</p>` : ''}
        </div>`
      });
    },

    /* ------------------------------------------------------------------
       ITEM MASTER & VENDORS (Modules 0 & 4)
       ------------------------------------------------------------------ */
    renderCodifier() {
      const f = this.poc.codeForm;
      const cat = CATEGORIES[f.cat];
      if (!cat.subs[f.sub]) f.sub = Object.keys(cat.subs)[0];
      setHTML('codifier', `
        <div class="poc-grid-2" style="margin-bottom:0;">
          <div class="form-grid">
            <div><label class="shad-label" for="cf-cat">Category</label><select class="shad-select" id="cf-cat" onchange="app.setCodeField('cat', this.value)">${Object.entries(CATEGORIES).map(([k, v]) => `<option value="${k}" ${k === f.cat ? 'selected' : ''}>${k} · ${esc(v.label)}</option>`).join('')}</select></div>
            <div><label class="shad-label" for="cf-sub">Sub-category</label><select class="shad-select" id="cf-sub" onchange="app.setCodeField('sub', this.value)">${Object.entries(cat.subs).map(([k, v]) => `<option value="${k}" ${k === f.sub ? 'selected' : ''}>${k} · ${esc(v)}</option>`).join('')}</select></div>
            <div class="span-2"><label class="shad-label" for="cf-desc">Description</label><input class="shad-input" id="cf-desc" value="${esc(f.desc)}" oninput="app.setCodeField('desc', this.value, true)" placeholder="e.g. Kookaburra pink match ball, box of 12"></div>
            <div><label class="shad-label" for="cf-uom">Unit of measure</label><select class="shad-select" id="cf-uom" onchange="app.setCodeField('uom', this.value)">${['Box (12 pcs)', 'Unit', 'Set', 'Pair', 'Kg', 'Litre'].map(u => `<option ${u === f.uom ? 'selected' : ''}>${u}</option>`).join('')}</select></div>
            <div><label class="shad-label" for="cf-nature">Item nature</label><select class="shad-select" id="cf-nature" onchange="app.setCodeField('nature', this.value)"><option ${f.nature === 'Consumable' ? 'selected' : ''}>Consumable</option><option ${f.nature === 'Non-consumable asset' ? 'selected' : ''}>Non-consumable asset</option></select></div>
            <div><label class="shad-label" for="cf-exp">Expenditure</label><select class="shad-select" id="cf-exp" onchange="app.setCodeField('exp', this.value)"><option ${f.exp === 'OpEx' ? 'selected' : ''}>OpEx</option><option ${f.exp === 'CapEx' ? 'selected' : ''}>CapEx</option></select></div>
            <div><label class="shad-label" for="cf-reorder">Re-order level</label><input class="shad-input" id="cf-reorder" type="number" value="${f.reorder}" oninput="app.poc.codeForm.reorder=this.value"></div>
            ${f.nature === 'Non-consumable asset' ? `
              <div><label class="shad-label" for="cf-war">Warranty</label><input class="shad-input" id="cf-war" value="${esc(f.warranty)}" oninput="app.poc.codeForm.warranty=this.value"></div>
              <div><label class="shad-label" for="cf-life">Useful life</label><input class="shad-input" id="cf-life" value="${esc(f.life)}" oninput="app.poc.codeForm.life=this.value"></div>
              <div class="span-2"><label class="shad-label" for="cf-dep">Depreciation rule</label><input class="shad-input" id="cf-dep" value="${esc(f.dep)}" oninput="app.poc.codeForm.dep=this.value"></div>` : ''}
          </div>
          <div id="codifier-out"></div>
        </div>`);
      this.renderCodeOutput();
    },

    setCodeField(k, v, light) {
      this.poc.codeForm[k] = v;
      if (k === 'nature') this.poc.codeForm.exp = v === 'Non-consumable asset' ? 'CapEx' : 'OpEx';
      if (light) this.renderCodeOutput(); else this.renderCodifier();
    },

    nextCode() {
      const f = this.poc.codeForm;
      const prefix = `PCB-${f.cat}-${f.sub}-`;
      const used = D.itemsMaster.filter(i => i.code.startsWith(prefix)).map(i => parseInt(i.code.slice(-4), 10));
      const pending = D.approvals.filter(a => a.type === 'Item Code Request' && a.ref.startsWith(prefix)).map(a => parseInt(a.ref.slice(-4), 10));
      const n = Math.max(0, ...used, ...pending) + 1;
      return prefix + String(n).padStart(4, '0');
    },

    duplicateMatches(desc) {
      const stop = new Set(['of', 'the', 'and', 'for', 'box', 'set', 'unit', 'pcs', '12', 'with']);
      const words = desc.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !stop.has(w));
      if (words.length < 2) return [];
      return D.itemsMaster.map(i => {
        const name = i.name.toLowerCase();
        const hits = words.filter(w => name.includes(w)).length;
        return { i, score: hits / words.length };
      }).filter(x => x.score >= 0.5).sort((a, b) => b.score - a.score);
    },

    renderCodeOutput() {
      const f = this.poc.codeForm;
      const code = this.nextCode();
      const dups = this.duplicateMatches(f.desc);
      setHTML('codifier-out', `
        <div class="panel" style="height:100%; display:flex; flex-direction:column; gap:12px;">
          <div><div class="panel-title">Next available code</div><div class="panel-value t-primary" style="font-size:24px;">${code}</div><div class="small muted">Category · sub-category · serial. Codes are never reused.</div></div>
          <div class="chip-row">${badge('outline', f.exp)}${badge('secondary', f.nature)}${badge('secondary', f.uom)}</div>
          ${!f.desc.trim() ? `<div class="callout callout-info">${svg('info', 16)}<div>Enter a description to run the duplicate check.</div></div>`
            : dups.length ? `<div class="callout callout-warning">${svg('alert', 16)}<div><b>Possible duplicate</b>${dups.slice(0, 2).map(d => `<div><span class="mono">${d.i.code}</span> · ${esc(d.i.name.slice(0, 50))} (${Math.round(d.score * 100)}% match)</div>`).join('')}<div style="margin-top:4px;">Use the existing code, or justify a new one in the approval.</div></div></div>`
            : `<div class="callout callout-success">${svg('check', 16)}<div><b>No duplicate found</b>Checked against description, specification and unit of measure.</div></div>`}
          <div class="small muted" style="margin-top:auto;">New codes go to the Catalogue Officer and Director Procurement for approval before use.</div>
        </div>`);
    },

    submitNewItemCode() {
      const f = this.poc.codeForm;
      if (!f.desc.trim()) { this.toast('Description needed', 'Add a description before submitting the code.'); const d = document.getElementById('cf-desc'); if (d) d.focus(); return; }
      const code = this.nextCode();
      const dup = this.duplicateMatches(f.desc)[0];
      const r = this.currentRole();
      const id = `APR-2026-0${this.poc.aprSeq++}`;
      D.approvals.unshift({ id, type: 'Item Code Request', ref: code, title: `New code: ${f.desc}`, amount: null, band: '—', dept: 'Catalogue', requestedBy: r.user, submitted: D.today, slaHours: 24, elapsedHours: 0, status: 'pending', isNew: true,
        chain: [{ role: 'Catalogue Officer', name: 'Saima Khan', status: 'approved', at: stamp(), remark: dup ? `Possible duplicate of ${dup.i.code} reviewed; distinct specification.` : 'No duplicate found.' }, { role: 'Director Procurement', name: 'Usman Zafar', status: 'pending', roleKey: 'director' }] });
      this.logAudit('Item code requested', `${code}: ${f.desc}.`, 'Item Master', `${f.nature}, ${f.exp}, ${f.uom}. Sent for approval as ${id}.`);
      this.toast('Code submitted for approval', `${code} routed as ${id}.`);
      this.poc.codeForm.desc = '';
      this.renderCodifier();
      this.renderApprovalsAll();
      this.renderOverviewPoc();
    },

    renderCatalogue() {
      setHTML('catalogue-tbody', D.itemsMaster.map(i => {
        const all = this.ledgerCompute(i.code, new Date(2026, 6, 1), new Date(2100, 0, 1));
        const grns = all ? all.rows.filter(e => e.type === 'GRN') : [];
        const last = grns[grns.length - 1];
        const asset = D.assetAttributes[i.code];
        return `<tr onclick="app.inspectItem('${i.code}')">
          <td class="mono small strong">${i.code}</td>
          <td><div class="strong small">${esc(i.name.slice(0, 52))}</div><div class="sub">${esc(i.category)} · ${esc(i.uom)}</div></td>
          <td><div class="chip-row">${badge(i.budgetType === 'CapEx' ? 'outline' : 'secondary', i.budgetType)}${badge('secondary', i.classification.includes('Asset') ? 'Asset' : 'Consumable')}</div></td>
          <td class="small">${asset ? `${esc(asset.warranty)} · ${esc(asset.usefulLife)}<div class="sub">${esc(asset.depreciation)}</div>` : `<span class="muted">Shelf life ${esc(i.shelfLife)}</span>`}</td>
          <td class="small">${last ? `${esc(last.date)}<div class="sub">${esc(last.party)} · ${pkr(last.unitCost)}</div>` : '<span class="muted">—</span>'}</td>
          <td class="right num">${num(all ? all.close.wac : i.avgCostPkr)}</td>
        </tr>`;
      }).join(''));
    },

    vendorStatusBadge(v) {
      if (v.status === 'Blacklisted') return badge('destructive', `Blacklisted to ${v.until}`, 'lock');
      if (v.status === 'Blacklisting proposed') return badge('warning', 'Blacklisting proposed', 'alert');
      return badge('success', 'Eligible', 'check');
    },

    renderVendors() {
      setHTML('vendor-tbody', D.vendors.map(v => `<tr class="${v.status === 'Blacklisted' ? 'is-dim' : ''}">
        <td><div class="strong small">${esc(v.name)}</div><div class="sub">${esc(v.category)}</div></td>
        <td class="mono small">${esc(v.ntn)}<div class="sub">${v.atl ? '<span class="t-success">Active taxpayer</span>' : '<span class="t-danger">Not on ATL</span>'}</div></td>
        <td style="min-width:120px;"><div class="bar ${v.prequal < 70 ? 'is-danger' : ''}"><i style="width:${v.prequal}%"></i></div><div class="sub">${v.prequal} / 100</div></td>
        <td class="right num ${v.onTime < 80 ? 't-danger' : ''}">${v.onTime}%</td>
        <td class="right num">${v.rating.toFixed(1)}</td>
        <td class="small">${esc(v.nextDoc)}<div class="sub">${v.expiryDays < 0 ? '<span class="t-danger strong">Overdue</span>' : v.expiryDays <= 30 ? `<span class="t-warning strong">Expires ${esc(v.nextExpiry)} (${v.expiryDays} days)</span>` : `Valid to ${esc(v.nextExpiry)}`}</div></td>
        <td>${this.vendorStatusBadge(v)}</td>
        <td class="right">${v.status === 'Eligible' ? `<button type="button" class="shad-btn shad-btn-ghost shad-btn-sm" data-write onclick="app.proposeBlacklist('${v.id}')">Propose blacklisting</button>` : ''}</td>
      </tr>`).join(''));
      const el = document.getElementById('vendor-chart');
      if (el && el.offsetParent) C.hbars(el, D.vendors.map(v => ({ name: v.name.split(' (')[0], value: v.prequal, color: v.prequal < 70 ? '--chart-5' : '--chart-1' })), { fmt: x => `${x}` });
    },

    proposeBlacklist(id) {
      const v = vendorById(id);
      this.openModal('bl-dialog', { footer: false,
        title: `Propose blacklisting · ${v.name}`,
        content: `<div class="form-grid">
            <div class="span-2"><label class="shad-label" for="bl-reason">Reason</label><textarea class="shad-textarea" id="bl-reason">Repeated late delivery and liquidated damages on two orders.</textarea></div>
            <div><label class="shad-label" for="bl-period">Debarment period</label><select class="shad-select" id="bl-period"><option>1 year</option><option selected>2 years</option><option>3 years</option></select></div>
          </div>
          <p class="small muted" style="margin-top:10px;">Goes to the approval matrix. Once approved, the vendor is excluded from invitations and award automatically.</p>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;"><button type="button" class="shad-btn shad-btn-outline" onclick="app.closeDialog('bl-dialog')">Cancel</button><button type="button" class="shad-btn shad-btn-danger" onclick="app.saveBlacklistProposal('${id}')">Submit proposal</button></div>`
      });
    },

    saveBlacklistProposal(id) {
      const v = vendorById(id);
      const reason = document.getElementById('bl-reason').value.trim() || '—';
      const period = document.getElementById('bl-period').value;
      const aid = `APR-2026-0${this.poc.aprSeq++}`;
      v.status = 'Blacklisting proposed';
      D.approvals.unshift({ id: aid, type: 'Vendor Blacklisting', ref: v.id, title: `Debar ${v.name} for ${period}`, amount: null, band: '—', dept: 'Procurement Wing', requestedBy: this.currentRole().user, submitted: D.today, slaHours: 120, elapsedHours: 0, status: 'pending', isNew: true,
        chain: [{ role: 'Procurement Committee', name: 'Committee', status: 'approved', at: stamp(), remark: reason }, { role: 'Director Procurement', name: 'Usman Zafar', status: 'pending', roleKey: 'director' }] });
      this.closeDialog('bl-dialog');
      this.logAudit('Blacklisting proposed', `${v.name}: ${period}.`, 'Vendor Control', reason);
      this.renderVendors();
      this.renderApprovalsAll();
      this.renderOverviewPoc();
    },

    /* ------------------------------------------------------------------
       GLOBAL SEARCH (FR-11.6)
       ------------------------------------------------------------------ */
    filterInventoryTable(q) {
      if (this.currentTab === 'inventory') this.renderInventory(q);
      this.globalSearch(q);
    },

    globalSearch(q) {
      const wrap = document.querySelector('.shad-search-wrap');
      let pop = document.getElementById('search-pop');
      if (!pop) { pop = document.createElement('div'); pop.id = 'search-pop'; pop.className = 'search-pop'; wrap.appendChild(pop); }
      const t = (q || '').trim().toLowerCase();
      if (t.length < 2) { pop.classList.remove('show'); return; }
      const groups = [
        ['Items', D.itemsMaster.filter(i => (i.code + i.name).toLowerCase().includes(t)).map(i => ({ label: i.code, sub: i.name, go: `app.inspectItem('${i.code}')` }))],
        ['Demands & PRs', D.demands.filter(d => [d.id, d.pr, d.sin, d.dept].join(' ').toLowerCase().includes(t)).map(d => ({ label: d.id, sub: `${d.dept} · ${d.pr || d.sin || ''}`, go: `app.showTab('inventory')` }))],
        ['Purchase orders', D.purchaseOrders.filter(p => (p.po + p.vendor + p.item).toLowerCase().includes(t)).map(p => ({ label: p.po, sub: `${p.vendor} · ${p.item}`, go: `app.openPO('${p.po}')` }))],
        ['Vendors', D.vendors.filter(v => (v.name + v.ntn).toLowerCase().includes(t)).map(v => ({ label: v.name, sub: `NTN ${v.ntn}`, go: `app.showTab('items')` }))],
        ['Approvals', D.approvals.filter(a => (a.id + a.ref + a.title).toLowerCase().includes(t)).map(a => ({ label: a.id, sub: a.title, go: `app.openApproval('${a.id}')` }))],
        ['Departments', [...new Set(D.demands.map(d => d.dept).concat(D.departmentCustodians.map(d => d.dept)))].filter(d => d.toLowerCase().includes(t)).map(d => ({ label: d, sub: 'Department', go: `app.showTab('custody')` }))]
      ].filter(([, list]) => list.length);
      pop.innerHTML = groups.length ? groups.map(([g, list]) => `<div class="sp-group">${esc(g)}</div>${list.slice(0, 4).map(r => `<button type="button" class="sp-item" onmousedown="event.preventDefault(); ${r.go}; app.closeSearch();"><span class="mono">${esc(r.label)}</span><span class="sp-sub">${esc(r.sub)}</span></button>`).join('')}`).join('') : `<div class="empty">No matches for “${esc(q)}”.</div>`;
      pop.classList.add('show');
    },

    closeSearch() {
      const pop = document.getElementById('search-pop');
      if (pop) pop.classList.remove('show');
    },

    /* ------------------------------------------------------------------
       BOOT & TAB HOOKS
       ------------------------------------------------------------------ */
    onTabShown(tab) {
      if (!this.poc) return;
      const run = {
        overview: () => { this.renderOverviewKpis(); this.renderOverviewCharts(); this.renderPipeline(); this.renderBudgets(); },
        inventory: () => { this.renderInventory(); this.renderInventoryCharts(); },
        approvals: () => { this.renderApprovalKpis(); this.renderApprovalCharts(); },
        orders: () => { this.renderOrdersAll(); this.renderOrdersCharts(); },
        finance: () => this.renderFinanceCharts(),
        reports: () => this.renderReports(),
        items: () => this.renderVendors(),
        tenders: () => this.renderSourcing()
      }[tab];
      if (run) requestAnimationFrame(run);
    },

    initPoc() {
      this.poc = {
        role: 'director', approvalFilter: 'pending', selectedApproval: 'APR-2026-0186', selectedPO: 'PO-PCB-2026-0324', lastGRN: null,
        reportType: 'ledger', period: 'fytd', ledgerItem: 'PCB-SPO-BALL-0042', custom: { from: '2026-08-01', to: '2026-09-30' },
        sourcingView: 'lifecycle', msValue: 1850000, msSpecial: 'none', sbdLocked: false,
        rfq: { dispatched: false, selected: new Set(['VND-0203', 'VND-0144', 'VND-0159']), quotes: [] },
        t089: { ita: false, closed: false, po: false },
        codeForm: { cat: 'SPO', sub: 'BALL', desc: '', uom: 'Box (12 pcs)', nature: 'Consumable', exp: 'OpEx', reorder: 20, warranty: '2 years', life: '5 years', dep: 'Straight-line 20% p.a.' },
        scheduled: [
          { name: 'Item ledger, all items', freq: 'Monthly', to: 'cfo@pcb.com.pk', fmt: 'PDF + Excel', next: '01-Nov-2026 07:00' },
          { name: 'Vendor performance', freq: 'Quarterly', to: 'director.procurement@pcb.com.pk', fmt: 'PDF', next: '01-Jan-2027 07:00' }
        ],
        grnSeq: 504, aprSeq: 190, demandSeq: 1052, sinSeq: 8903, prSeq: 4408, trfSeq: 48,
        tagSeq: { LGT: 21, MOW: 7, HWK: 13, REC: 15 }
      };
      D.itemsMaster.forEach(i => { const c = this.ledgerClose(i.code); if (c) i.avgCostPkr = Math.round(c.wac); });

      this.renderApprovalsShell();
      this.renderOrdersShell();
      this.renderReportsShell();
      this.renderDemands();
      this.renderInventory();
      this.renderStockTake();
      this.renderCustody();
      this.renderCodifier();
      this.renderCatalogue();
      this.renderVendors();
      this.renderFinanceQueue();
      this.renderSourcing();
      this.renderOrdersAll();
      this.applyRole('director');

      // Draw every chart up front so no card is ever empty; tab changes redraw at the real width
      [this.renderInventoryCharts, this.renderApprovalCharts, this.renderOrdersCharts, this.renderFinanceCharts].forEach(fn => {
        try { fn.call(this); } catch (e) { console.error('Chart render failed', e); }
      });

      const input = document.getElementById('global-search-input');
      if (input) {
        input.addEventListener('blur', () => setTimeout(() => this.closeSearch(), 120));
        input.addEventListener('keydown', e => { if (e.key === 'Escape') { input.value = ''; this.closeSearch(); input.blur(); } });
      }
      let t;
      window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(() => this.onTabShown(this.currentTab), 200); });
      this.onTabShown(this.currentTab);
    }
  };

  Object.assign(PcbEnterpriseApp.prototype, M);
  app.initPoc();
})();
