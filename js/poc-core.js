/* ==========================================================================
   PCB POC — CORE MODULES
   Shared helpers, role-based access, overview dashboard, Approvals (M7),
   Purchase Orders & Goods Receipt (M8/M9) and the Finance queue (M10).
   Methods are mixed into PcbEnterpriseApp; poc-screens.js boots everything.
   ========================================================================== */

const POC = (() => {
  const D = PCB_DATA;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = (n) => Math.round(n).toLocaleString('en-US');
  const pkr = (n) => 'PKR ' + num(n);
  const mil = (n, d = 1) => (n / 1e6).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) + 'M';
  const parseD = (s) => { const [d, m, y] = String(s).split(' ')[0].split('-'); return new Date(+y, MONTHS.indexOf(m), +d); };
  const fmtD = (dt) => `${String(dt.getDate()).padStart(2, '0')}-${MONTHS[dt.getMonth()]}-${dt.getFullYear()}`;
  const shortD = (s) => s.slice(0, 6).replace('-', ' ');
  const TODAY = parseD(D.today);
  const stamp = () => { const n = new Date(); return `${D.today.slice(0, 6)} ${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; };
  const daysBetween = (a, b) => Math.round((b - a) / 86400000);

  const P = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    unlock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 5L2 7"/>',
    print: '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
    truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 9.38a1 1 0 0 0-.78-.38H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
    file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
    gavel: '<path d="m14 13-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10"/><path d="m16 16 6-6"/><path d="m8 8 6-6"/><path d="m9 7 8 8"/><path d="m21 11-8-8"/>',
    plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
    layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'
  };
  const svg = (name, size = 14) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  const badge = (kind, text, icon) => `<span class="shad-badge shad-badge-${kind}">${icon ? svg(icon, 11) : ''}${esc(text)}</span>`;

  function cardHead(title, desc, right = '') {
    return `<div class="shad-card-header"><div class="card-head-row"><div><h2 class="shad-card-title">${title}</h2>${desc ? `<p class="shad-card-description">${desc}</p>` : ''}</div>${right}</div></div>`;
  }

  function kpi(k) {
    const delta = k.delta ? `<span class="delta ${k.delta.dir}">${k.delta.dir === 'up' ? '▲' : k.delta.dir === 'down' ? '▼' : '•'} ${esc(k.delta.text)}</span>` : '';
    return `
      <div class="kpi ${k.hero ? 'is-hero' : ''}" ${k.go ? `onclick="app.showTab('${k.go}')" title="Open ${esc(k.label)}"` : ''}>
        <div class="kpi-head"><span>${esc(k.label)}</span><span class="kpi-icon">${svg(k.icon || 'chart', 15)}</span></div>
        <div class="kpi-value">${k.prefix ? `<small>${k.prefix}</small>` : ''}<span data-count="${k.value}" data-dec="${k.decimals || 0}" data-suffix="${k.suffix || ''}">0</span></div>
        <div class="kpi-foot"><div style="display:flex; flex-direction:column; gap:2px;">${delta}<span>${k.foot || ''}</span></div>${k.spark ? `<svg class="kpi-spark" data-spark="${k.spark.join(',')}" data-color="${k.sparkColor || '--chart-1'}"></svg>` : ''}</div>
      </div>`;
  }

  function hydrate(root) {
    if (!root) return;
    root.querySelectorAll('[data-count]').forEach(el => {
      PcbCharts.countUp(el, parseFloat(el.dataset.count), { decimals: +el.dataset.dec || 0, suffix: el.dataset.suffix || '' });
    });
    root.querySelectorAll('svg[data-spark]').forEach(el => PcbCharts.spark(el, el.dataset.spark.split(',').map(Number), el.dataset.color));
  }

  function setHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; return el; }

  function downloadCSV(filename, rows) {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  const vendorById = (id) => D.vendors.find(v => v.id === id);
  const itemByCode = (code) => D.itemsMaster.find(i => i.code === code);
  const headById = (id) => D.budgetHeads.find(b => b.id === id);
  const storeName = (id) => (D.stadiumStores.find(s => s.id === id) || {}).name || id;

  return { D, MONTHS, esc, num, pkr, mil, parseD, fmtD, shortD, TODAY, stamp, daysBetween, svg, badge, cardHead, kpi, hydrate, setHTML, downloadCSV, vendorById, itemByCode, headById, storeName };
})();

(() => {
  const { D, esc, num, pkr, mil, parseD, TODAY, stamp, daysBetween, svg, badge, cardHead, kpi, hydrate, setHTML, vendorById, itemByCode, headById } = POC;
  const C = PcbCharts;

  const ROLE_SCOPE = {
    director: 'Approver for bands B2–B5 · all 9 screens',
    committee: 'Tender evaluation, bidding documents and grievances',
    cfo: 'Budget, approvals above PKR 3M, three-way match and payments',
    storekeeper: 'Stores, demands, custody and goods receipt',
    auditor: 'Read-only access to every screen · all views are logged'
  };

  const M = {

    /* ------------------------------------------------------------------
       ROLES & ACCESS (NFR-2, FR-11.6)
       ------------------------------------------------------------------ */
    currentRole() { return D.roles[(this.poc && this.poc.role) || 'director']; },

    canAccess(tab) {
      const r = this.currentRole();
      return r.tabs === 'all' || r.tabs.includes(tab);
    },

    switchRole(roleKey) { this.applyRole(roleKey); },

    applyRole(roleKey) {
      this.poc.role = roleKey;
      const r = D.roles[roleKey];
      document.body.classList.toggle('role-readonly', !!r.readOnly);
      const av = document.querySelector('.shad-header .shad-avatar');
      if (av) { av.textContent = r.initials; av.title = `${r.user} (${r.label})`; }
      const sel = document.getElementById('role-select');
      if (sel) sel.value = roleKey;
      document.querySelectorAll('.screen-pill, .shad-nav-link').forEach(el => {
        const locked = !this.canAccess(el.dataset.tab);
        el.classList.toggle('is-locked', locked);
        el.title = locked ? `Not available to ${r.label}` : '';
      });
      this.renderOverviewPoc();
      this.renderApprovalsAll();
      if (!this.canAccess(this.currentTab)) this.showTab('overview');
    },

    logAudit(title, desc, badgeText, details) {
      D.recentActivities.unshift({ id: 'ACT-' + Date.now(), title, desc, time: 'Just now', badge: badgeText, details: details || desc, user: this.currentRole().user, at: stamp() });
      if (D.recentActivities.length > 40) D.recentActivities.pop();
      this.renderOverview();
    },

    /* ------------------------------------------------------------------
       OVERVIEW DASHBOARD (role-based, Module 11)
       ------------------------------------------------------------------ */
    renderOverviewPoc() {
      const role = this.poc.role;
      const r = this.currentRole();
      setHTML('role-banner', `
        <div class="shad-avatar">${r.initials}</div>
        <div class="grow">
          <div class="strong">Signed in as ${esc(r.user)} · ${esc(r.label)}</div>
          <div class="small muted">${ROLE_SCOPE[role]}. Segregation of duties is enforced on every approval.</div>
        </div>
        <span class="shad-badge shad-badge-outline">FY 2026-27 · Q2</span>
        <span class="shad-badge shad-badge-info readonly-note">${svg('lock', 11)}Read-only session</span>`);
      document.querySelectorAll('#role-banner .readonly-note').forEach(n => n.style.display = r.readOnly ? 'inline-flex' : '');
      this.renderOverviewKpis();
      this.renderWorklist();
      this.renderPipeline();
      this.renderBudgets();
      this.renderOverviewCharts();
    },

    overviewMetrics() {
      const role = this.poc.role;
      const allocation = D.budgetHeads.reduce((a, b) => a + b.allocation, 0);
      const committed = D.budgetHeads.reduce((a, b) => a + b.committed, 0);
      const pendingMine = D.approvals.filter(a => a.status === 'pending' && (a.chain.find(s => s.status === 'pending') || {}).roleKey === role);
      const breached = D.approvals.filter(a => a.status === 'pending' && a.elapsedHours > a.slaHours);
      const lowStock = D.itemsMaster.filter(i => i.totalStock <= i.reorderLevel);
      const stockValue = D.stadiumStores.reduce((a, s) => a + s.valuationPkr, 0);
      const acks = Object.values(D.custodyMeta).filter(m => m.ack === 'Pending');
      const exceptions = D.invoices.filter(i => i.match === 'Exception');
      const payables = D.invoices.filter(i => i.status === 'Approved for payment').reduce((a, i) => a + i.base * 1.18 - i.base * 0.045, 0);
      const openPOs = D.purchaseOrders.filter(p => p.received < p.qty);
      const openPOValue = openPOs.reduce((a, p) => a + (p.qty - p.received) * p.unitPrice * (1 + p.taxRate), 0);
      const overdue = D.purchaseOrders.filter(p => p.received < p.qty && parseD(p.due) < TODAY);
      const headsHigh = D.budgetHeads.filter(b => b.committed / b.allocation > 0.75);
      const openGrv = D.grievances.filter(g => !g.status.startsWith('Closed'));
      return { allocation, committed, pendingMine, breached, lowStock, stockValue, acks, exceptions, payables, openPOs, openPOValue, overdue, headsHigh, openGrv };
    },

    renderOverviewKpis() {
      const m = this.overviewMetrics();
      const A = D.analytics;
      const pct = (m.committed / m.allocation) * 100;
      const sets = {
        director: [
          { label: 'Committed spend, FY to date', prefix: 'PKR', value: m.committed / 1e6, decimals: 1, suffix: 'M', icon: 'wallet', hero: true, foot: `${pct.toFixed(0)}% of PKR ${mil(m.allocation, 0)} budget`, spark: [28, 61.3, 105.6, m.committed / 1e6], go: 'reports' },
          { label: 'Awaiting my approval', value: m.pendingMine.length, icon: 'clock', delta: m.breached.length ? { dir: 'down', text: `${m.breached.length} past SLA` } : { dir: 'flat', text: 'All within SLA' }, foot: 'Approval inbox', go: 'approvals' },
          { label: 'Demand-to-PO cycle time', value: A.cycleDays[3], suffix: ' days', icon: 'gauge', delta: { dir: 'up', text: '5 days faster than Sep' }, foot: `Target ${A.cycleTarget} days`, spark: A.cycleDays, sparkColor: '--chart-2', go: 'reports' },
          { label: 'Active tenders and RFQs', value: A.activeTenders[3], icon: 'gavel', foot: '2 in evaluation · 1 in standstill', spark: A.activeTenders, sparkColor: '--chart-4', go: 'tenders' }
        ],
        cfo: [
          { label: 'Budget committed', value: pct, decimals: 1, suffix: '%', icon: 'wallet', hero: true, foot: `PKR ${mil(m.committed)} of ${mil(m.allocation, 0)}`, spark: [11.6, 25.4, 43.8, pct], go: 'reports' },
          { label: 'Payables cleared for release', prefix: 'PKR', value: m.payables / 1e6, decimals: 2, suffix: 'M', icon: 'check', foot: 'Matched and approved invoices', go: 'finance' },
          { label: 'Three-way match exceptions', value: m.exceptions.length, icon: 'alert', delta: m.exceptions.length ? { dir: 'down', text: 'Needs review' } : { dir: 'flat', text: 'None' }, foot: 'Outside tolerance', go: 'finance' },
          { label: 'Budget heads above 75%', value: m.headsHigh.length, icon: 'layers', foot: m.headsHigh.map(h => h.name.split(' ')[0]).join(', ') || 'None', go: 'overview' }
        ],
        storekeeper: [
          { label: 'Stock value, all stores', prefix: 'PKR', value: m.stockValue / 1e6, decimals: 1, suffix: 'M', icon: 'box', hero: true, foot: '5 stores · one ledger', spark: A.stockValue, go: 'inventory' },
          { label: 'Items at or below re-order level', value: m.lowStock.length, icon: 'alert', delta: { dir: 'down', text: 'Re-order alerts' }, foot: m.lowStock.map(i => i.code.split('-')[2]).join(', '), go: 'inventory' },
          { label: 'Purchase orders awaiting receipt', value: m.openPOs.length, icon: 'truck', delta: m.overdue.length ? { dir: 'down', text: `${m.overdue.length} overdue` } : null, foot: 'Goods receipt queue', go: 'orders' },
          { label: 'Custody confirmations pending', value: m.acks.length, icon: 'users', foot: 'Recipient has not confirmed', go: 'custody' }
        ],
        committee: [
          { label: 'Tenders in evaluation', value: 2, icon: 'gavel', hero: true, foot: '089 floodlights · RFQ-0117', go: 'tenders' },
          { label: 'Comparative statements to sign', value: D.approvals.filter(a => a.type === 'Comparative Statement' && a.status === 'pending').length, icon: 'file', foot: 'Committee sign-off', go: 'approvals' },
          { label: 'Open grievances', value: m.openGrv.length, icon: 'shield', foot: 'Redressal committee', go: 'approvals' },
          { label: 'Conflict-of-interest declarations', value: 100, suffix: '%', icon: 'check', foot: 'All members declared', go: 'tenders' }
        ],
        auditor: [
          { label: 'Audit events logged today', value: 1284 + D.recentActivities.length, icon: 'shield', hero: true, foot: 'Tamper-evident, hash-chained', go: 'reports' },
          { label: 'Segregation-of-duty blocks', value: D.approvals.filter(a => a.sodBlocked).length, icon: 'lock', foot: 'Self-approval prevented', go: 'approvals' },
          { label: 'Approvals past SLA', value: m.breached.length, icon: 'clock', foot: 'Auto-escalated', go: 'approvals' },
          { label: 'Match exceptions', value: m.exceptions.length, icon: 'alert', foot: 'Invoice outside tolerance', go: 'finance' }
        ]
      };
      const el = setHTML('overview-kpis', (sets[this.poc.role] || sets.director).map(kpi).join(''));
      hydrate(el);
    },

    renderWorklist() {
      const role = this.poc.role;
      const m = this.overviewMetrics();
      let items = [];
      const aprItem = a => {
        const pct = Math.min(100, (a.elapsedHours / a.slaHours) * 100);
        const late = a.elapsedHours > a.slaHours;
        return { title: `${a.type}: ${a.ref}`, meta: `${a.title}${a.amount ? ' · ' + pkr(a.amount) : ''}`, badge: late ? badge('destructive', 'Past SLA', 'alert') : badge('warning', `${a.slaHours - a.elapsedHours}h left`, 'clock'), bar: { pct, cls: late ? 'is-danger' : pct > 80 ? 'is-warning' : '' }, go: `app.openApproval('${a.id}')` };
      };
      if (role === 'director' || role === 'cfo') items = D.approvals.filter(a => a.status === 'pending' && (a.chain.find(s => s.status === 'pending') || {}).roleKey === role).map(aprItem);
      if (role === 'cfo') {
        m.exceptions.forEach(i => items.push({ title: `Match exception: ${i.inv}`, meta: `${i.vendor} · ${i.exception.note.split('.')[0]}`, badge: badge('destructive', 'Exception', 'alert'), go: `app.showTab('finance')` }));
        D.invoices.filter(i => i.status === 'Approved for payment').forEach(i => items.push({ title: `Release payment: ${i.inv}`, meta: `${i.vendor} · ${pkr(i.base * 1.18 - i.base * 0.045)} net`, badge: badge('success', 'Ready', 'check'), go: `app.showTab('finance')` }));
      }
      if (role === 'storekeeper') {
        m.openPOs.forEach(p => items.push({ title: `Receive ${p.po}`, meta: `${p.item} · ${p.qty - p.received} outstanding · due ${p.due}`, badge: parseD(p.due) < TODAY ? badge('destructive', 'Overdue', 'alert') : badge('info', 'Due', 'truck'), go: `app.openPO('${p.po}')` }));
        m.lowStock.forEach(i => items.push({ title: `Re-order: ${i.code}`, meta: `${i.name} · ${i.totalStock} on hand, re-order at ${i.reorderLevel}`, badge: badge('warning', 'Low stock', 'alert'), go: `app.showTab('inventory')` }));
        if (D.stockTake.status !== 'Approved') items.push({ title: `Stock-take ${D.stockTake.id}`, meta: 'Variance found on 1 item · approval needed', badge: badge('warning', 'Variance', 'alert'), go: `app.showTab('inventory')` });
      }
      if (role === 'committee') {
        items.push({ title: 'Score technical envelopes: RFQ-2026-0117', meta: 'Pitch rollers and turf seed · closes 19-Oct', badge: badge('info', 'Open', 'clock'), go: `app.openSourcing('rfq')` });
        items.push({ title: 'Bidding document comments: SBD v4.2-PCB-089', meta: '3 comments · lock final version', badge: badge('secondary', 'Review'), go: `app.openSourcing('docs')` });
        m.openGrv.forEach(g => items.push({ title: `Grievance ${g.id}`, meta: `${g.subject} · ${g.status}`, badge: badge('warning', 'Hearing', 'gavel'), go: `app.showTab('approvals')` }));
      }
      if (role === 'auditor') {
        m.breached.forEach(a => items.push({ title: `SLA breach: ${a.id}`, meta: `${a.type} · ${a.elapsedHours}h against ${a.slaHours}h SLA`, badge: badge('destructive', 'Escalated', 'alert'), go: `app.openApproval('${a.id}')` }));
        D.approvals.filter(a => a.sodBlocked).forEach(a => items.push({ title: `Self-approval blocked: ${a.ref}`, meta: `${a.requestedBy} raised and was next approver`, badge: badge('info', 'SoD', 'shield'), go: `app.openApproval('${a.id}')` }));
        m.exceptions.forEach(i => items.push({ title: `Match exception: ${i.inv}`, meta: i.vendor, badge: badge('destructive', 'Exception', 'alert'), go: `app.showTab('finance')` }));
      }
      const count = items.length;
      setHTML('ov-work-count', `${count} open`);
      setHTML('ov-worklist', count ? `<div class="worklist">${items.slice(0, 6).map(w => `
        <div class="work-item" onclick="${w.go}">
          <div class="work-title">${esc(w.title)}</div>
          ${w.badge}
          <div class="work-meta">${esc(w.meta)}</div>
          ${w.bar ? `<div class="bar ${w.bar.cls}"><i style="width:${w.bar.pct}%"></i></div>` : ''}
        </div>`).join('')}</div>` : `<div class="empty">${svg('check', 18)}<div style="margin-top:6px;">Nothing waiting for you.</div></div>`);
    },

    renderPipeline() {
      const rows = D.analytics.pipeline;
      const max = rows[0].n;
      const colors = ['--chart-1', '--chart-1', '--chart-2', '--chart-4', '--chart-3', '--chart-6', '--chart-6', '--chart-1'];
      setHTML('ov-pipeline', `<div class="pipeline">${rows.map((r, i) => `
        <div class="pipe-row" onclick="app.showTab('${r.tab}')" title="Open ${esc(r.stage)}">
          <span>${esc(r.stage)}</span>
          <div class="pipe-track"><div class="pipe-fill" style="width:${Math.max(8, (r.n / max) * 100)}%; --c:var(${colors[i]}); animation-delay:${i * 70}ms">${Math.round((r.n / max) * 100)}%</div></div>
          <span class="n">${r.n}</span>
        </div>`).join('')}</div>`);
    },

    renderBudgets() {
      setHTML('ov-budgets', `<div class="budget-list">${D.budgetHeads.map((b, i) => {
        const c = (b.committed / b.allocation) * 100, s = (b.spent / b.allocation) * 100;
        return `<div class="budget-row">
          <div class="top"><b>${esc(b.name)}</b><span class="num">${mil(b.committed)} / ${mil(b.allocation, 0)}</span></div>
          <div class="budget-track ${c > 75 ? 'is-warning' : ''}"><i class="committed" style="width:${c}%; animation-delay:${i * 80}ms"></i><i class="spent" style="width:${s}%; animation-delay:${i * 80 + 120}ms"></i></div>
          <div class="small muted">${b.type} · ${c.toFixed(0)}% committed · ${s.toFixed(0)}% spent${c > 75 ? ' · <span class="t-warning strong">above 75%</span>' : ''}</div>
        </div>`;
      }).join('')}</div>`);
    },

    renderOverviewCharts() {
      const A = D.analytics;
      const el = document.getElementById('ov-spend-chart');
      if (!el) return;
      C.bars(el, {
        labels: A.months, stacked: true, height: 300, aria: 'Committed spend by month, CapEx and OpEx',
        series: [
          { name: 'CapEx', color: '--chart-1', values: A.committedCapex },
          { name: 'OpEx', color: '--chart-2', values: A.committedOpex }
        ],
        fmt: v => (Number.isInteger(v) ? v : v.toFixed(1)),
        tipFmt: v => `PKR ${v.toFixed(1)}M`,
        tipTitle: i => A.monthLabels[i],
        target: { value: A.monthlyPlan, label: '' }
      });
    },

    /* ------------------------------------------------------------------
       APPROVALS & WORKFLOW (Module 7)
       ------------------------------------------------------------------ */
    renderApprovalsShell() {
      setHTML('tab-approvals', `
        <div class="shad-page-header">
          <div>
            <div class="eyebrow">Module 7</div>
            <h1 class="shad-page-title">Approvals &amp; Workflow</h1>
            <p class="shad-page-description">Approval matrix by value band, delegation, SLA escalation, Intention to Award and grievance redressal.</p>
          </div>
          <div class="shad-page-actions">
            <button type="button" class="shad-btn shad-btn-outline" onclick="app.showApprovalMatrix()">${svg('layers')}<span>Approval matrix</span></button>
          </div>
        </div>
        <div class="kpi-grid" id="apr-kpis"></div>
        <div class="poc-grid-2">
          <div class="shad-card">
            ${cardHead('Approval inbox', 'Select a request to see its approval chain and act on it.', `<div class="seg" id="apr-filter">
              <button type="button" data-f="pending" onclick="app.setApprovalFilter('pending')">Pending</button>
              <button type="button" data-f="returned" onclick="app.setApprovalFilter('returned')">Returned</button>
              <button type="button" data-f="done" onclick="app.setApprovalFilter('done')">Completed</button>
              <button type="button" data-f="all" onclick="app.setApprovalFilter('all')">All</button></div>`)}
            <div class="shad-card-content table-scroll" style="padding:0;">
              <table class="shad-table"><thead><tr><th>Request</th><th class="right">Amount</th><th>Stage</th><th style="width:140px;">SLA</th><th>Status</th></tr></thead><tbody id="apr-tbody"></tbody></table>
            </div>
          </div>
          <div class="shad-card" id="apr-detail"></div>
        </div>
        <div class="poc-grid-2-even">
          <div class="shad-card">
            ${cardHead('Intention to Award &amp; standstill', 'No purchase order can be released until the grievance window closes.')}
            <div class="shad-card-content" id="apr-ita"></div>
          </div>
          <div class="shad-card">
            ${cardHead('Grievance register', 'Complaint intake, committee assignment, hearing and decision.', `<button type="button" class="shad-btn shad-btn-outline shad-btn-sm" data-write onclick="app.openGrievanceForm()">${svg('plus')}<span>Log grievance</span></button>`)}
            <div class="shad-card-content table-scroll" style="padding:0;">
              <table class="shad-table"><thead><tr><th>Grievance</th><th>Complainant</th><th>Hearing</th><th>Status</th><th></th></tr></thead><tbody id="apr-grv"></tbody></table>
            </div>
          </div>
        </div>
        <div class="poc-grid-2-even">
          <div class="shad-card chart-card">
            ${cardHead('Average approval time by document', 'Hours from submission to final decision, FY to date. SLA is 48 hours.')}
            <div class="shad-card-content"><div id="apr-chart"></div></div>
          </div>
          <div class="shad-card">
            ${cardHead('Delegation &amp; escalation', 'Out-of-office delegation without sharing credentials.')}
            <div class="shad-card-content" id="apr-delegation"></div>
          </div>
        </div>`);
    },

    renderApprovalsAll() {
      if (!document.getElementById('apr-tbody')) this.renderApprovalsShell();
      this.renderApprovalKpis();
      this.renderApprovalInbox();
      this.renderApprovalDetail();
      this.renderIntentions();
      this.renderGrievances();
      this.renderDelegation();
    },

    renderApprovalKpis() {
      const role = this.poc.role;
      const pending = D.approvals.filter(a => a.status === 'pending');
      const mine = pending.filter(a => (a.chain.find(s => s.status === 'pending') || {}).roleKey === role);
      const breached = pending.filter(a => a.elapsedHours > a.slaHours);
      const el = setHTML('apr-kpis', [
        { label: 'Awaiting my decision', value: mine.length, icon: 'clock', hero: true, foot: `${pending.length} pending across all approvers` },
        { label: 'Past SLA and escalated', value: breached.length, icon: 'alert', delta: breached.length ? { dir: 'down', text: 'Escalated to next authority' } : { dir: 'flat', text: 'None' }, foot: '' },
        { label: 'Approvals on time', value: D.analytics.slaOnTime[3], suffix: '%', icon: 'gauge', delta: { dir: 'up', text: '+3 pts vs Sep' }, spark: D.analytics.slaOnTime, sparkColor: '--chart-2', foot: 'This month' },
        { label: 'Value awaiting approval', prefix: 'PKR', value: pending.reduce((a, x) => a + (x.amount || 0), 0) / 1e6, decimals: 1, suffix: 'M', icon: 'wallet', foot: 'All pending requests' }
      ].map(kpi).join(''));
      hydrate(el);
    },

    setApprovalFilter(f) { this.poc.approvalFilter = f; this.renderApprovalInbox(); },

    renderApprovalInbox() {
      const f = this.poc.approvalFilter;
      document.querySelectorAll('#apr-filter button').forEach(b => b.classList.toggle('active', b.dataset.f === f));
      const list = D.approvals.filter(a => f === 'all' || (f === 'pending' && a.status === 'pending') || (f === 'returned' && a.status === 'returned') || (f === 'done' && (a.status === 'approved' || a.status === 'rejected')));
      setHTML('apr-tbody', list.length ? list.map(a => {
        const step = a.chain.find(s => s.status === 'pending');
        const idx = a.chain.filter(s => s.status === 'approved').length;
        const pct = Math.min(100, (a.elapsedHours / a.slaHours) * 100);
        const late = a.status === 'pending' && a.elapsedHours > a.slaHours;
        const st = a.status === 'approved' ? badge('success', 'Approved', 'check') : a.status === 'rejected' ? badge('destructive', 'Rejected', 'x') : a.status === 'returned' ? badge('warning', 'Returned', 'undo') : late ? badge('destructive', 'Past SLA', 'alert') : badge('info', 'Pending', 'clock');
        return `<tr class="${a.id === this.poc.selectedApproval ? 'is-selected' : ''} ${a.isNew ? 'is-new' : ''}" onclick="app.openApproval('${a.id}', false)">
          <td><div class="strong">${esc(a.type)} <span class="mono small muted">${esc(a.ref)}</span></div><div class="sub">${esc(a.title)}</div></td>
          <td class="right num nowrap">${a.amount ? mil(a.amount, 2) : '—'}</td>
          <td class="nowrap"><div class="small">${step ? esc(step.role) : a.status === 'approved' ? 'Complete' : '—'}</div><div class="sub">Step ${Math.min(idx + 1, a.chain.length)} of ${a.chain.length}</div></td>
          <td>${a.status === 'pending' ? `<div class="bar ${late ? 'is-danger' : pct > 80 ? 'is-warning' : ''}"><i style="width:${pct}%"></i></div><div class="sub">${a.elapsedHours}h / ${a.slaHours}h</div>` : '<span class="small muted">—</span>'}</td>
          <td>${st}</td>
        </tr>`;
      }).join('') : `<tr><td colspan="5"><div class="empty">No requests in this view.</div></td></tr>`);
      D.approvals.forEach(a => delete a.isNew);
    },

    openApproval(id, navigate = true) {
      this.poc.selectedApproval = id;
      const a = D.approvals.find(x => x.id === id);
      if (a && navigate) {
        this.poc.approvalFilter = a.status === 'pending' ? 'pending' : a.status === 'returned' ? 'returned' : 'done';
        this.showTab('approvals');
      }
      this.renderApprovalInbox();
      this.renderApprovalDetail();
    },

    renderApprovalDetail() {
      const a = D.approvals.find(x => x.id === this.poc.selectedApproval) || D.approvals[0];
      if (!a) return;
      const r = this.currentRole();
      const role = this.poc.role;
      const step = a.chain.find(s => s.status === 'pending');
      const sod = a.status === 'pending' && a.requestedBy === r.user;
      const canAct = a.status === 'pending' && step && !r.readOnly && !sod && step.roleKey === role;
      const late = a.status === 'pending' && a.elapsedHours > a.slaHours;
      const pct = Math.min(100, (a.elapsedHours / a.slaHours) * 100);
      const matrix = D.approvalMatrix.find(b => b.band === a.band);

      const chain = a.chain.map((s, i) => `
        <div class="chain-step ${s.status}">
          <div class="chain-dot">${s.status === 'approved' ? '✓' : s.status === 'rejected' || s.status === 'returned' ? '!' : i + 1}</div>
          <div>
            <div class="chain-role">${esc(s.role)} <span class="chain-meta">· ${esc(s.name)}</span></div>
            <div class="chain-meta">${s.status === 'approved' ? `Approved ${esc(s.at)}` : s.status === 'pending' ? 'Awaiting decision' : s.status === 'returned' ? `Returned for clarification ${esc(s.at)}` : s.status === 'rejected' ? `Rejected ${esc(s.at)}` : 'Not yet reached'}</div>
            ${s.remark ? `<div class="chain-remark">${esc(s.remark)}</div>` : ''}
          </div>
        </div>`).join('');

      let action = '';
      if (sod) {
        action = `<div class="callout callout-info">${svg('shield', 16)}<div><b>Segregation of duties</b>You raised this request, so you cannot approve it. The system routes it to the alternate approver.
          <div style="margin-top:8px;"><button type="button" class="shad-btn shad-btn-outline shad-btn-sm" data-write onclick="app.rerouteApproval('${a.id}')">Route to CFO (alternate approver)</button></div></div></div>`;
      } else if (canAct) {
        action = `
          <label class="shad-label" for="apr-remark">Remarks (required to reject or return)</label>
          <textarea class="shad-textarea" id="apr-remark" placeholder="Add your remarks for the record"></textarea>
          <div class="small t-danger" id="apr-remark-err" style="display:none; margin-top:4px;">Add a remark before rejecting or returning this request.</div>
          <div style="display:flex; gap:8px; margin-top:12px; flex-wrap:wrap;">
            <button type="button" class="shad-btn shad-btn-default" data-write onclick="app.decideApproval('approve')">${svg('check')}<span>Approve</span></button>
            <button type="button" class="shad-btn shad-btn-outline" data-write onclick="app.decideApproval('return')">${svg('undo')}<span>Return for clarification</span></button>
            <button type="button" class="shad-btn shad-btn-danger" data-write onclick="app.decideApproval('reject')">${svg('x')}<span>Reject</span></button>
          </div>`;
      } else if (a.status === 'pending' && step) {
        const who = step.roleKey ? D.roles[step.roleKey].label : step.role;
        action = `<div class="callout callout-warning">${svg('clock', 16)}<div><b>Waiting for ${esc(step.role)}</b>${step.roleKey ? `Switch the role selector to ${esc(who)} to act on this step.` : 'This approver is outside the system demo roles.'}
          ${!step.roleKey && !r.readOnly ? `<div style="margin-top:8px;"><button type="button" class="shad-btn shad-btn-outline shad-btn-sm" data-write onclick="app.decideApproval('approve', true)">Record ${esc(step.role)} sign-off (demo)</button></div>` : ''}</div></div>`;
      } else if (a.status === 'approved') {
        action = `<div class="callout callout-success">${svg('check', 16)}<div><b>Fully approved</b>All ${a.chain.length} steps in band ${esc(a.band)} are complete.</div></div>`;
      } else if (a.status === 'returned') {
        action = `<div class="callout callout-warning">${svg('undo', 16)}<div><b>Returned to requester</b>Waiting for ${esc(a.requestedBy)} to respond.</div></div>`;
      } else {
        action = `<div class="callout callout-danger">${svg('x', 16)}<div><b>Rejected</b>The requester has been notified.</div></div>`;
      }

      setHTML('apr-detail', `
        <div class="shad-card-header">
          <div class="chip-row" style="margin-bottom:6px;">${badge('outline', a.type)}<span class="shad-badge shad-badge-secondary mono">${esc(a.id)}</span>${a.band !== '—' ? badge('secondary', 'Band ' + a.band) : ''}</div>
          <h2 class="shad-card-title" style="display:block;">${esc(a.title)}</h2>
          <p class="shad-card-description">${esc(a.ref)} · ${esc(a.dept)} · raised by ${esc(a.requestedBy)} on ${esc(a.submitted)}</p>
        </div>
        <div class="shad-card-content" style="display:flex; flex-direction:column; gap:16px;">
          <div class="poc-grid-3" style="grid-template-columns:repeat(2,minmax(0,1fr));">
            <div class="panel"><div class="panel-title">Amount</div><div class="panel-value">${a.amount ? pkr(a.amount) : '—'}</div></div>
            <div class="panel"><div class="panel-title">SLA</div>
              ${a.status === 'pending' ? `<div class="panel-value ${late ? 't-danger' : ''}">${a.elapsedHours}h <span class="small muted" style="font-family:var(--font-sans)">of ${a.slaHours}h</span></div><div class="bar ${late ? 'is-danger' : pct > 80 ? 'is-warning' : ''}" style="margin-top:6px;"><i style="width:${pct}%"></i></div>${late ? `<div class="small t-danger" style="margin-top:4px;">Escalated to ${a.amount > 50000000 ? 'COO' : 'next authority'} · reminder sent</div>` : ''}` : '<div class="panel-value muted">—</div>'}
            </div>
          </div>
          ${matrix ? `<div class="small muted">Routing from approval matrix, band ${esc(a.band)} (${esc(matrix.range)}): ${matrix.chain.map(esc).join(' → ')}</div>` : ''}
          <div class="chain">${chain}</div>
          ${action}
          ${a.linkTender !== undefined ? `<button type="button" class="shad-btn shad-btn-outline shad-btn-sm" style="align-self:flex-start;" onclick="app.switchTender(${a.linkTender}); app.showTab('tenders');">Open comparative statement ${svg('arrow')}</button>` : ''}
        </div>`);
    },

    rerouteApproval(id) {
      const a = D.approvals.find(x => x.id === id);
      const step = a.chain.find(s => s.status === 'pending');
      step.role = 'CFO (alternate approver)'; step.name = 'Tariq Mehmood'; step.roleKey = 'cfo';
      a.requestedBy = a.requestedBy + ' (self-raised)';
      this.logAudit('Self-approval prevented', `${a.ref} re-routed to CFO under segregation of duties.`, 'Access Control', `${a.id}: requester was also the next approver. Routed to alternate approver Tariq Mehmood.`);
      this.toast('Routed to alternate approver', `${a.ref} now waits for the CFO.`);
      this.renderApprovalsAll();
      this.renderOverviewPoc();
    },

    decideApproval(action, demo = false) {
      const a = D.approvals.find(x => x.id === this.poc.selectedApproval);
      if (!a) return;
      const step = a.chain.find(s => s.status === 'pending');
      if (!step) return;
      const box = document.getElementById('apr-remark');
      const remark = box ? box.value.trim() : '';
      if ((action === 'reject' || action === 'return') && !remark) {
        const err = document.getElementById('apr-remark-err');
        if (err) err.style.display = 'block';
        if (box) box.focus();
        return;
      }
      const r = this.currentRole();
      step.at = stamp();
      if (!demo && step.roleKey) step.name = r.user;
      if (action === 'approve') {
        step.status = 'approved';
        step.remark = remark || (demo ? 'Approved (recorded by Board Secretariat).' : 'Approved.');
        const next = a.chain.find(s => s.status === 'waiting');
        if (next) { next.status = 'pending'; a.elapsedHours = 0; }
        else { a.status = 'approved'; this.onApprovalComplete(a); }
        this.logAudit(`${a.type} approved`, `${a.ref}: ${step.role} approved${next ? `, routed to ${next.role}` : ' (final)'}.`, 'Approval Workflow', `${a.id} · ${step.role} (${step.name}) · ${step.at}. Remark: ${step.remark}`);
        this.toast(next ? 'Approved and routed' : 'Final approval recorded', next ? `${a.ref} moved to ${next.role}.` : `${a.ref} is fully approved.`);
      } else if (action === 'reject') {
        step.status = 'rejected'; step.remark = remark; a.status = 'rejected';
        this.logAudit(`${a.type} rejected`, `${a.ref} rejected by ${step.role}.`, 'Approval Workflow', `${a.id}. Remark: ${remark}`);
        this.toast('Rejected', `${a.ref} returned to ${a.requestedBy} with your remarks.`);
      } else {
        step.status = 'returned'; step.remark = remark; a.status = 'returned';
        this.logAudit(`${a.type} returned`, `${a.ref} returned for clarification.`, 'Approval Workflow', `${a.id}. Remark: ${remark}`);
        this.toast('Returned for clarification', `${a.requestedBy} has been notified.`);
      }
      this.renderApprovalsAll();
      this.renderOverviewPoc();
    },

    onApprovalComplete(a) {
      if (a.id === 'APR-2026-0186') {
        this.poc.t089.ita = true;
        D.tenders[0].currentStage = 'Intention to Award (standstill)';
        D.intentions.unshift({ tenderIdx: 0, tender: 'PCB/LOG-PSL10/2026/089', title: 'LED floodlights, Gaddafi Stadium', bidder: 'Signify Pakistan Ltd', published: D.today, expires: '23-Oct-2026 17:00', days: 10, elapsed: 0, grievances: 0, isNew: true });
        this.logAudit('Intention to Award published', 'Tender PCB/LOG-PSL10/2026/089: 10-day standstill started.', 'PPRA Compliance', 'Notice posted on PCB and PPRA websites. All bidders notified by email. Standstill ends 23-Oct-2026 17:00.');
        if (this.renderSourcing) this.renderSourcing();
      }
      if (a.id === 'APR-2026-0181') {
        const v = D.vendors.find(x => x.id === 'VND-0412');
        if (v) { v.status = 'Blacklisted'; v.until = '13-Oct-2028'; }
        this.logAudit('Vendor blacklisted', 'Apex Engineering Consortium debarred until 13-Oct-2028.', 'Vendor Control', 'Excluded automatically from RFQ invitations and award.');
        if (this.renderVendors) this.renderVendors();
      }
      if (a.id === 'APR-2026-0188') {
        const d = D.demands.find(x => x.id === 'REQ-2026-1044');
        if (d) d.status = 'PR approved, call-off on framework 041';
        if (this.renderDemands) this.renderDemands();
      }
      if (a.type === 'Item Code Request') {
        this.logAudit('Item code activated', `${a.ref} added to the central catalogue.`, 'Item Master', `${a.title}`);
      }
      if (a.type === 'Purchase Requisition' && a.demandId) {
        const d = D.demands.find(x => x.id === a.demandId);
        if (d) d.status = 'PR approved, sent to sourcing';
        if (this.renderDemands) this.renderDemands();
      }
    },

    showApprovalMatrix() {
      this.openModal('matrix-dialog', {
        title: 'Approval matrix · delegation of financial powers',
        content: `
          <p class="small muted" style="margin-bottom:12px;">Held as configuration, not code. Amendable without a release. Thresholds shown are illustrative; PCB confirms its DFP in Phase 0.</p>
          <table class="shad-table"><thead><tr><th>Band</th><th>Value range</th><th>Approval chain</th></tr></thead><tbody>
            ${D.approvalMatrix.map(b => `<tr><td>${badge('secondary', b.band)}</td><td class="nowrap">${esc(b.range)}</td><td class="small">${b.chain.map(esc).join(' → ')}</td></tr>`).join('')}
          </tbody></table>
          <div class="callout callout-info" style="margin-top:14px;">${svg('info', 16)}<div><b>Rules applied on every request</b>Sequential or parallel routing · reminders at 80% of SLA · escalation to the next authority at 100% · a requester can never approve their own request.</div></div>`
      });
    },

    renderIntentions() {
      setHTML('apr-ita', D.intentions.length ? `<div style="display:flex; flex-direction:column; gap:14px;">${D.intentions.map((t, i) => {
        const closed = t.elapsed >= t.days;
        const openGrv = D.grievances.filter(g => g.tender === t.tender && !g.status.startsWith('Closed')).length;
        return `<div class="panel" ${t.isNew ? 'style="animation:riseIn .5s var(--ease-out) both"' : ''}>
          <div class="card-head-row" style="margin-bottom:8px;">
            <div><div class="strong">${esc(t.title)}</div><div class="small muted mono">${esc(t.tender)}</div></div>
            ${badge('award', t.bidder, 'trophy')}
          </div>
          <div class="bar is-gold"><i style="width:${(t.elapsed / t.days) * 100}%"></i></div>
          <div class="card-head-row small muted" style="margin-top:6px;">
            <span>Day ${t.elapsed} of ${t.days} · published ${esc(t.published)} · ends ${esc(t.expires)}</span>
            <span>${openGrv ? `<span class="t-danger strong">${openGrv} open grievance</span>` : 'No grievances'}</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:10px; flex-wrap:wrap;">
            ${closed && !openGrv ? badge('success', 'Window closed · PO can be released', 'unlock') : badge('warning', 'Purchase order release locked', 'lock')}
            ${!closed ? `<button type="button" class="shad-btn shad-btn-ghost shad-btn-sm" data-write onclick="app.closeStandstill(${i})">Skip to end of window (demo)</button>` : ''}
          </div>
        </div>`;
      }).join('')}</div>` : '<div class="empty">No awards in standstill.</div>');
      D.intentions.forEach(t => delete t.isNew);
    },

    closeStandstill(i) {
      const t = D.intentions[i];
      t.elapsed = t.days;
      if (t.tender === 'PCB/LOG-PSL10/2026/089') this.poc.t089.closed = true;
      this.logAudit('Standstill window closed', `${t.tender}: grievance window ended.`, 'PPRA Compliance', `No further complaints accepted. Purchase order may be released if no grievance is open.`);
      this.renderIntentions();
      if (this.renderSourcing) this.renderSourcing();
    },

    renderGrievances() {
      setHTML('apr-grv', D.grievances.map(g => {
        const open = !g.status.startsWith('Closed');
        return `<tr class="${g.isNew ? 'is-new' : ''}">
          <td><div class="strong mono small">${esc(g.id)}</div><div class="sub">${esc(g.subject)} · ${esc(g.tender)}</div></td>
          <td><div class="small">${esc(g.complainant)}</div><div class="sub">${esc(g.ground)}</div></td>
          <td class="nowrap small">${esc(g.hearing)}</td>
          <td>${open ? badge('warning', g.status, 'gavel') : badge('secondary', g.status)}</td>
          <td>${open ? `<button type="button" class="shad-btn shad-btn-outline shad-btn-sm" data-write onclick="app.openGrievanceDecision('${g.id}')">Record decision</button>` : ''}</td>
        </tr>`;
      }).join(''));
      D.grievances.forEach(g => delete g.isNew);
    },

    openGrievanceForm() {
      const opts = D.intentions.filter(t => t.elapsed < t.days).map(t => `<option value="${esc(t.tender)}|${esc(t.title)}">${esc(t.tender)} · ${esc(t.title)}</option>`).join('');
      this.openModal('grv-dialog', { footer: false,
        title: 'Log a grievance',
        content: opts ? `<div class="form-grid">
            <div class="span-2"><label class="shad-label" for="grv-tender">Tender (open standstill windows only)</label><select class="shad-select" id="grv-tender">${opts}</select></div>
            <div class="span-2"><label class="shad-label" for="grv-who">Complainant</label><input class="shad-input" id="grv-who" value="Musco Stadium Lighting International"></div>
            <div class="span-2"><label class="shad-label" for="grv-ground">Grounds of complaint</label><textarea class="shad-textarea" id="grv-ground">Warranty period was not given weight in the evaluation.</textarea></div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;"><button type="button" class="shad-btn shad-btn-outline" onclick="app.closeDialog('grv-dialog')">Cancel</button><button type="button" class="shad-btn shad-btn-default" onclick="app.saveGrievance()">Register grievance</button></div>`
          : '<div class="empty">No tender is currently in its standstill window, so complaints are closed.</div>'
      });
    },

    saveGrievance() {
      const [tender, subject] = document.getElementById('grv-tender').value.split('|');
      const who = document.getElementById('grv-who').value.trim() || 'Unnamed bidder';
      const ground = document.getElementById('grv-ground').value.trim() || '—';
      const id = `GRV-2026-${String(D.grievances.length + 6).padStart(3, '0')}`;
      D.grievances.unshift({ id, tender, subject, complainant: who, filed: D.today, ground, committee: 'Grievance Redressal Committee (3)', hearing: 'To be scheduled', status: 'Hearing to be scheduled', isNew: true });
      this.closeDialog('grv-dialog');
      this.logAudit('Grievance registered', `${id} against ${tender}.`, 'PPRA Compliance', `${who}: ${ground}`);
      this.toast('Grievance registered', `${id} assigned to the redressal committee. PO release stays locked.`);
      this.renderGrievances();
      this.renderIntentions();
      this.renderOverviewPoc();
    },

    openGrievanceDecision(id) {
      const g = D.grievances.find(x => x.id === id);
      this.openModal('grv-dec-dialog', { footer: false,
        title: `Decision on ${id}`,
        content: `<dl class="kv"><dt>Tender</dt><dd>${esc(g.tender)}</dd><dt>Complainant</dt><dd>${esc(g.complainant)}</dd><dt>Grounds</dt><dd>${esc(g.ground)}</dd></dl>
          <div class="divider"></div>
          <label class="shad-label" for="grv-dec">Committee decision</label>
          <select class="shad-select" id="grv-dec"><option>Closed: complaint rejected</option><option>Closed: upheld, re-evaluate</option></select>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;"><button type="button" class="shad-btn shad-btn-outline" onclick="app.closeDialog('grv-dec-dialog')">Cancel</button><button type="button" class="shad-btn shad-btn-default" onclick="app.saveGrievanceDecision('${id}')">Record decision</button></div>`
      });
    },

    saveGrievanceDecision(id) {
      const g = D.grievances.find(x => x.id === id);
      g.status = document.getElementById('grv-dec').value;
      g.hearing = g.hearing === 'To be scheduled' ? D.today : g.hearing;
      this.closeDialog('grv-dec-dialog');
      this.logAudit('Grievance decided', `${id}: ${g.status}.`, 'PPRA Compliance', `${g.complainant} · ${g.tender}`);
      this.renderGrievances();
      this.renderIntentions();
      this.renderOverviewPoc();
    },

    renderDelegation() {
      const d = D.delegation;
      setHTML('apr-delegation', `
        <div class="panel" style="margin-bottom:14px;">
          <div class="card-head-row"><div><div class="strong">${esc(d.from)} → ${esc(d.to)}</div><div class="small muted">${esc(d.period)} · ${esc(d.reason)}</div></div>
          ${d.active ? badge('success', 'Active', 'check') : badge('secondary', 'Ended')}</div>
          ${d.active ? `<button type="button" class="shad-btn shad-btn-outline shad-btn-sm" style="margin-top:10px;" data-write onclick="app.endDelegation()">End delegation</button>` : ''}
        </div>
        <div class="chain">
          <div class="chain-step approved"><div class="chain-dot">1</div><div><div class="chain-role">Reminder at 80% of SLA</div><div class="chain-meta">Email and in-app to the current approver</div></div></div>
          <div class="chain-step pending"><div class="chain-dot">2</div><div><div class="chain-role">Escalation at 100%</div><div class="chain-meta">Routed to the next authority in the matrix, original approver copied</div></div></div>
          <div class="chain-step"><div class="chain-dot">3</div><div><div class="chain-role">Daily breach summary</div><div class="chain-meta">Sent to Director Procurement and Internal Audit</div></div></div>
        </div>`);
    },

    endDelegation() {
      D.delegation.active = false;
      this.logAudit('Delegation ended', `${D.delegation.from} → ${D.delegation.to}.`, 'Approval Workflow');
      this.renderDelegation();
    },

    renderApprovalCharts() {
      const el = document.getElementById('apr-chart');
      if (!el) return;
      C.hbars(el, D.analytics.approvalHoursByType.map(r => ({ ...r, color: r.value > 48 ? '--chart-5' : '--chart-1' })), { fmt: v => `${v}h` });
    },

    /* ------------------------------------------------------------------
       PURCHASE ORDERS & GOODS RECEIPT (Modules 8 & 9)
       ------------------------------------------------------------------ */
    renderOrdersShell() {
      setHTML('tab-orders', `
        <div class="shad-page-header">
          <div>
            <div class="eyebrow">Modules 8 &amp; 9</div>
            <h1 class="shad-page-title">Purchase Orders &amp; Goods Receipt</h1>
            <p class="shad-page-description">Orders generated from approved evaluations, budget commitment on release, delivery tracking and receipt with inspection.</p>
          </div>
          <div class="shad-page-actions">
            <button type="button" class="shad-btn shad-btn-default" data-write onclick="app.requestPOFromTender()">${svg('file')}<span>Generate PO from approved evaluation</span></button>
          </div>
        </div>
        <div class="kpi-grid" id="po-kpis"></div>
        <div class="poc-grid-2">
          <div class="shad-card">
            ${cardHead('Purchase order register', 'Select an order to track delivery and record goods receipt.')}
            <div class="shad-card-content table-scroll" style="padding:0;">
              <table class="shad-table"><thead><tr><th>Purchase order</th><th class="right">Value incl. tax</th><th style="width:150px;">Received</th><th>Due</th><th>Status</th></tr></thead><tbody id="po-tbody"></tbody></table>
            </div>
          </div>
          <div class="shad-card" id="po-detail"></div>
        </div>
        <div class="poc-grid-2-even">
          <div class="shad-card">
            ${cardHead('Goods receipt notes', 'Every receipt updates stock and average cost, and is passed to Finance.')}
            <div class="shad-card-content table-scroll" style="padding:0;">
              <table class="shad-table"><thead><tr><th>GRN</th><th>Purchase order</th><th>Date</th><th class="right">Accepted</th><th>Inspection</th></tr></thead><tbody id="grn-tbody"></tbody></table>
            </div>
          </div>
          <div class="shad-card chart-card">
            ${cardHead('On-time delivery by vendor', 'Share of deliveries received by the PO due date, FY to date. Feeds vendor performance.')}
            <div class="shad-card-content"><div id="po-vendor-chart"></div></div>
          </div>
        </div>`);
    },

    poValue(p) { return p.qty * p.unitPrice + (p.extras || []).reduce((a, x) => a + x.amount, 0); },

    poStatus(p) {
      if (p.received >= p.qty) return p.status === 'Closed' ? 'Closed' : 'Fully received';
      if (parseD(p.due) < TODAY) return 'Overdue';
      if (p.received > 0) return 'Partially received';
      return p.status === 'Issued' ? 'Issued' : 'In transit';
    },

    poBadge(s) {
      return ({ 'Fully received': badge('success', s, 'check'), 'Closed': badge('secondary', s), 'Overdue': badge('destructive', s, 'alert'), 'Partially received': badge('warning', s, 'truck'), 'In transit': badge('info', s, 'truck'), 'Issued': badge('info', s, 'mail') })[s] || badge('secondary', s);
    },

    renderOrdersAll() {
      if (!document.getElementById('po-tbody')) this.renderOrdersShell();
      const open = D.purchaseOrders.filter(p => p.received < p.qty);
      const overdue = open.filter(p => parseD(p.due) < TODAY);
      const ld = overdue.reduce((a, p) => a + this.poValue(p) * 0.001 * daysBetween(parseD(p.due), TODAY), 0);
      const el = setHTML('po-kpis', [
        { label: 'Open order value', prefix: 'PKR', value: open.reduce((a, p) => a + (p.qty - p.received) * p.unitPrice * (1 + p.taxRate), 0) / 1e6, decimals: 1, suffix: 'M', icon: 'file', hero: true, foot: `${open.length} orders awaiting delivery` },
        { label: 'Overdue deliveries', value: overdue.length, icon: 'alert', delta: overdue.length ? { dir: 'down', text: `LD accruing ${pkr(ld)}` } : { dir: 'flat', text: 'None' }, foot: '' },
        { label: 'Units awaiting receipt', value: open.reduce((a, p) => a + p.qty - p.received, 0), icon: 'truck', foot: 'Across all open orders' },
        { label: 'GRNs posted this month', value: D.grns.filter(g => g.date.includes('Oct-2026')).length, icon: 'box', foot: 'Passed to Finance automatically' }
      ].map(kpi).join(''));
      hydrate(el);

      if (!D.purchaseOrders.find(p => p.po === this.poc.selectedPO)) this.poc.selectedPO = D.purchaseOrders[0].po;
      setHTML('po-tbody', D.purchaseOrders.map(p => {
        const s = this.poStatus(p);
        const pct = (p.received / p.qty) * 100;
        return `<tr class="${p.po === this.poc.selectedPO ? 'is-selected' : ''} ${p.isNew ? 'is-new' : ''}" onclick="app.openPO('${p.po}', false)">
          <td><div class="strong mono small">${esc(p.po)}</div><div class="sub">${esc(p.vendor)} · ${esc(p.item)}</div></td>
          <td class="right num nowrap">${mil(this.poValue(p) * (1 + p.taxRate), 2)}</td>
          <td><div class="bar ${pct >= 100 ? '' : 'is-warning'}"><i style="width:${pct}%"></i></div><div class="sub">${p.received} of ${p.qty}</div></td>
          <td class="nowrap small ${s === 'Overdue' ? 't-danger strong' : ''}">${esc(p.due)}</td>
          <td>${this.poBadge(s)}</td>
        </tr>`;
      }).join(''));
      D.purchaseOrders.forEach(p => delete p.isNew);

      setHTML('grn-tbody', D.grns.map(g => `<tr class="${g.isNew ? 'is-new' : ''}">
        <td class="mono small strong">${esc(g.grn)}</td><td class="mono small">${esc(g.po)}</td><td class="small nowrap">${esc(g.date)}</td>
        <td class="right num">${g.accepted}${g.rejected ? ` <span class="t-danger small">(${g.rejected} rejected)</span>` : ''}</td>
        <td class="small">${esc(g.inspector)}<div class="sub">${esc(g.remark)}</div></td></tr>`).join(''));
      D.grns.forEach(g => delete g.isNew);

      this.renderPODetail();
    },

    openPO(po, navigate = true) {
      this.poc.selectedPO = po;
      this.poc.lastGRN = null;
      if (navigate) this.showTab('orders');
      this.renderOrdersAll();
    },

    renderPODetail() {
      const p = D.purchaseOrders.find(x => x.po === this.poc.selectedPO);
      if (!p) return;
      const s = this.poStatus(p);
      const head = headById(p.budgetHead);
      const outstanding = p.qty - p.received;
      const late = s === 'Overdue' ? daysBetween(parseD(p.due), TODAY) : 0;
      const stages = ['Issued', 'Dispatched', 'Partially received', 'Fully received', 'Closed'];
      const at = s === 'Closed' ? 4 : s === 'Fully received' ? 3 : p.received > 0 ? 2 : (s === 'In transit' || s === 'Overdue') ? 1 : 0;
      const role = this.poc.role;
      const canReceive = outstanding > 0 && ['director', 'storekeeper'].includes(role);
      const g = this.poc.lastGRN;

      setHTML('po-detail', `
        <div class="shad-card-header">
          <div class="card-head-row"><div><div class="chip-row" style="margin-bottom:6px;"><span class="shad-badge shad-badge-secondary mono">${esc(p.po)}</span>${this.poBadge(s)}</div>
          <h2 class="shad-card-title" style="display:block;">${esc(p.item)}</h2>
          <p class="shad-card-description">${esc(p.vendor)} · ${esc(p.source)}</p></div>
          <div style="display:flex; gap:6px;"><button type="button" class="shad-btn shad-btn-outline shad-btn-sm" onclick="app.viewPODocument('${p.po}')">${svg('file')}<span>PO document</span></button></div></div>
        </div>
        <div class="shad-card-content" style="display:flex; flex-direction:column; gap:14px;">
          <div class="stepper">${stages.map((st, i) => `<span class="step ${i < at ? 'is-done' : i === at ? 'is-now' : ''}"><i>${i < at ? '✓' : i + 1}</i>${st}</span>`).join('')}</div>
          <div class="poc-grid-3">
            <div class="panel"><div class="panel-title">Ordered</div><div class="panel-value">${p.qty}</div></div>
            <div class="panel"><div class="panel-title">Received</div><div class="panel-value t-success">${p.received}</div></div>
            <div class="panel"><div class="panel-title">Outstanding</div><div class="panel-value ${outstanding ? 't-warning' : ''}">${outstanding}</div></div>
          </div>
          <dl class="kv">
            <dt>Unit price</dt><dd class="num">${pkr(p.unitPrice)}</dd>
            <dt>Order value</dt><dd class="num">${pkr(this.poValue(p))} + ${Math.round(p.taxRate * 100)}% sales tax = <b>${pkr(this.poValue(p) * (1 + p.taxRate))}</b></dd>
            <dt>Budget commitment</dt><dd>${esc(head ? head.name : p.budgetHead)} <span class="small muted">· posted on release</span></dd>
            <dt>Delivery terms</dt><dd>Due ${esc(p.due)} · LD ${esc(p.ld)}</dd>
            <dt>Payment terms</dt><dd>${esc(p.terms)}</dd>
          </dl>
          ${late ? `<div class="callout callout-danger">${svg('alert', 16)}<div><b>${late} days late</b>Liquidated damages accruing at 0.1% per day: ${pkr(this.poValue(p) * 0.001 * late)} so far. Delay recorded against vendor performance.</div></div>` : ''}
          ${g && g.po === p.po ? `<div class="callout callout-success">${svg('check', 16)}<div><b>${esc(g.grn)} posted</b>
              Stock at Gaddafi Central: ${g.stockBefore} → <b>${g.stockAfter}</b> · weighted average cost: ${pkr(g.wacBefore)} → <b>${pkr(g.wacAfter)}</b>${g.tags ? `<br>Asset tags created: <span class="mono">${esc(g.tags)}</span>` : ''}<br>Passed to Finance for three-way match.</div></div>` : ''}
          ${canReceive ? `
            <div class="divider" style="margin:0;"></div>
            <div class="strong">Record goods receipt</div>
            <div class="form-grid">
              <div><label class="shad-label" for="grn-qty">Quantity received</label><input class="shad-input" id="grn-qty" type="number" min="1" max="${outstanding}" value="${outstanding}"></div>
              <div><label class="shad-label" for="grn-rej">Rejected at inspection</label><input class="shad-input" id="grn-rej" type="number" min="0" value="0"></div>
              <div><label class="shad-label" for="grn-insp">Inspected by</label><input class="shad-input" id="grn-insp" value="${esc(this.currentRole().user)}"></div>
              <div><label class="shad-label" for="grn-note">Inspection remark</label><input class="shad-input" id="grn-note" value="Quantity and condition verified"></div>
            </div>
            <div class="small t-danger" id="grn-err" style="display:none;"></div>
            <div><button type="button" class="shad-btn shad-btn-default" data-write onclick="app.postGRN('${p.po}')">${svg('box')}<span>Post GRN and update stock</span></button></div>`
          : outstanding > 0 ? `<div class="callout callout-info">${svg('info', 16)}<div><b>Goods receipt</b>Recorded by the Central Storekeeper. Switch role to record a receipt.</div></div>` : ''}
        </div>`);
    },

    postGRN(poNo) {
      const p = D.purchaseOrders.find(x => x.po === poNo);
      const qty = parseInt(document.getElementById('grn-qty').value, 10) || 0;
      const rej = parseInt(document.getElementById('grn-rej').value, 10) || 0;
      const err = document.getElementById('grn-err');
      const outstanding = p.qty - p.received;
      if (qty < 1 || qty > outstanding) { err.textContent = `Enter a quantity between 1 and ${outstanding}.`; err.style.display = 'block'; return; }
      if (rej < 0 || rej > qty) { err.textContent = 'Rejected quantity cannot exceed the quantity received.'; err.style.display = 'block'; return; }
      const accepted = qty - rej;
      const item = itemByCode(p.itemCode);
      const ledger = D.itemLedgers[p.itemCode];
      const before = this.ledgerClose ? this.ledgerClose(p.itemCode) : { qty: item.centralStock, wac: item.avgCostPkr };
      const grnNo = `GRN-LHR-2026-0${this.poc.grnSeq++}`;

      p.received += accepted;
      if (accepted > 0) {
        item.totalStock += accepted;
        item.centralStock += accepted;
        item.storeBreakdown['STORE-LHR-01'] = (item.storeBreakdown['STORE-LHR-01'] || 0) + accepted;
        if (ledger) ledger.entries.push({ date: D.today, type: 'GRN', ref: grnNo, doc: p.po, qty: accepted, unitCost: p.unitPrice, party: p.vendor, purpose: 'Receipt against purchase order' });
      }
      const after = this.ledgerClose ? this.ledgerClose(p.itemCode) : { qty: item.centralStock, wac: item.avgCostPkr };
      item.avgCostPkr = Math.round(after.wac);
      let tags = '';
      if (item.classification.includes('Asset') && accepted > 0) {
        const sub = p.itemCode.split('-')[2];
        const base = this.poc.tagSeq[sub] || 1;
        this.poc.tagSeq[sub] = base + accepted;
        tags = `PCB-AST-${sub}-${String(base).padStart(3, '0')} to PCB-AST-${sub}-${String(base + accepted - 1).padStart(3, '0')}`;
      }
      D.grns.unshift({ grn: grnNo, po: p.po, date: D.today, qty, accepted, rejected: rej, inspector: document.getElementById('grn-insp').value, remark: document.getElementById('grn-note').value, isNew: true });
      D.invoices.unshift({ inv: 'Awaiting invoice', po: p.po, grn: grnNo, vendor: p.vendor, base: accepted * p.unitPrice, received: '—', match: 'Awaiting invoice', status: 'GRN received', ageing: 0, isNew: true });
      this.poc.lastGRN = { po: p.po, grn: grnNo, stockBefore: before.qty, stockAfter: after.qty, wacBefore: before.wac, wacAfter: after.wac, tags };
      this.logAudit('Goods received', `${grnNo} against ${p.po}: ${accepted} accepted${rej ? `, ${rej} rejected` : ''}.`, 'Goods Receipt', `Stock and weighted average cost updated for ${p.itemCode}. Transaction passed to Finance.`);
      this.toast('GRN posted', `${grnNo}: stock updated and sent to Finance.`);
      this.renderOrdersAll();
      this.renderInventory();
      if (this.renderFinanceQueue) this.renderFinanceQueue();
      this.renderOverviewPoc();
    },

    tenderGates() {
      const a = D.approvals.find(x => x.id === 'APR-2026-0186');
      const grvOpen = D.grievances.some(g => g.tender === 'PCB/LOG-PSL10/2026/089' && !g.status.startsWith('Closed'));
      const head = headById('BH-CAP-INF');
      return [
        { label: 'Committee evaluation signed, conflict-of-interest declarations on file', ok: true },
        { label: 'Comparative statement approved through matrix band B5 (APR-2026-0186)', ok: a && a.status === 'approved', go: "app.openApproval('APR-2026-0186')" },
        { label: 'Intention to Award published', ok: this.poc.t089.ita },
        { label: 'Standstill window closed with no open grievance', ok: this.poc.t089.closed && !grvOpen, go: "app.showTab('approvals')" },
        { label: 'Awardee not blacklisted (Signify Pakistan Ltd)', ok: true },
        { label: `Budget available on ${head.name}`, ok: head.allocation - head.committed >= 56876000 }
      ];
    },

    requestPOFromTender() {
      if (this.poc.t089.po) { this.openPO('PO-PCB-2026-0331'); return; }
      const gates = this.tenderGates();
      const blocked = gates.some(g => !g.ok);
      const list = gates.map(g => `<div style="display:flex; gap:10px; align-items:flex-start; padding:8px 0; border-bottom:1px solid hsl(var(--border));">
          <span class="${g.ok ? 't-success' : 't-danger'}" style="margin-top:2px;">${svg(g.ok ? 'check' : 'x', 15)}</span>
          <span style="flex:1; font-size:13px;">${esc(g.label)}</span>
          ${!g.ok && g.go ? `<button type="button" class="shad-btn shad-btn-link small" onclick="app.closeDialog('po-gate-dialog'); ${g.go}">Resolve</button>` : ''}
        </div>`).join('');
      if (blocked) {
        this.openModal('po-gate-dialog', {
          title: 'Purchase order release is blocked',
          content: `<div class="callout callout-warning" style="margin-bottom:12px;">${svg('lock', 16)}<div><b>PPRA controls not yet satisfied for tender 089</b>A purchase order is only generated once every check below passes.</div></div>${list}`
        });
        return;
      }
      this.openModal('po-gate-dialog', {
        title: 'Generate purchase order from approved evaluation', footer: false,
        content: `${list}<div class="divider"></div>${this.poDocumentHTML(this.draftPO089())}
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;"><button type="button" class="shad-btn shad-btn-outline" onclick="app.closeDialog('po-gate-dialog')">Cancel</button>
          <button type="button" class="shad-btn shad-btn-gold" onclick="app.issuePO089()">${svg('mail')}<span>Release PO and email vendor</span></button></div>`
      });
      const dlg = document.querySelector('#po-gate-dialog .shad-dialog');
      if (dlg) dlg.classList.add('is-wide');
    },

    draftPO089() {
      return { po: 'PO-PCB-2026-0331', date: D.today, vendor: 'Signify Pakistan Ltd (Philips Lighting)', vendorId: 'VND-0101', source: 'Tender PCB/LOG-PSL10/2026/089', itemCode: 'PCB-INF-LGT-0018', item: 'Philips ArenaVision LED luminaire 1500W', qty: 110, received: 0, unitPrice: 400000, extras: [{ desc: 'Turnkey rigging, aiming and commissioning (lump sum)', amount: 4200000 }], taxRate: 0.18, budgetHead: 'BH-CAP-INF', due: '20-Jan-2027', ld: '0.1% per day, max 10%', terms: '10% advance against bank guarantee, 90% on commissioning', status: 'Issued' };
    },

    issuePO089() {
      const p = this.draftPO089();
      p.isNew = true;
      D.purchaseOrders.unshift(p);
      const head = headById(p.budgetHead);
      const before = head.committed;
      head.committed += this.poValue(p) * (1 + p.taxRate);
      this.poc.t089.po = true;
      D.tenders[0].currentStage = 'Contract awarded · PO issued';
      this.poc.selectedPO = p.po;
      this.closeDialog('po-gate-dialog');
      this.logAudit('Purchase order released', `${p.po} to Signify Pakistan Ltd: ${pkr(this.poValue(p) * 1.18)} incl. tax.`, 'Purchase Order', `Budget commitment posted to ${head.name}: ${pkr(before)} → ${pkr(head.committed)}. PDF emailed to vendor.`);
      this.toast('Purchase order released', `${p.po} emailed to the vendor. Budget committed.`);
      this.showTab('orders');
      this.renderOrdersAll();
      if (this.renderSourcing) this.renderSourcing();
      this.renderOverviewPoc();
    },

    poDocumentHTML(p) {
      const v = vendorById(p.vendorId) || {};
      const lines = [{ desc: p.item, code: p.itemCode, qty: p.qty, rate: p.unitPrice, amount: p.qty * p.unitPrice }].concat((p.extras || []).map(x => ({ desc: x.desc, code: '—', qty: 1, rate: x.amount, amount: x.amount })));
      const base = this.poValue(p);
      return `<div class="doc-preview">
        <div class="doc-head"><div><h4>PAKISTAN CRICKET BOARD</h4><div class="muted">Gaddafi Stadium, Ferozepur Road, Lahore · Procurement Wing</div></div>
          <div class="right"><div class="strong">PURCHASE ORDER</div><div class="mono">${esc(p.po)}</div><div class="muted">${esc(p.date)}</div></div></div>
        <dl class="kv" style="margin-bottom:12px;"><dt>Vendor</dt><dd>${esc(p.vendor)} · NTN ${esc(v.ntn || '—')}</dd><dt>Source</dt><dd>${esc(p.source)}</dd><dt>Budget head</dt><dd>${esc((headById(p.budgetHead) || {}).name || p.budgetHead)}</dd></dl>
        <table class="shad-table"><thead><tr><th>Description</th><th>Item code</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Amount</th></tr></thead><tbody>
          ${lines.map(l => `<tr><td>${esc(l.desc)}</td><td class="mono small">${esc(l.code)}</td><td class="right num">${l.qty}</td><td class="right num">${num(l.rate)}</td><td class="right num">${num(l.amount)}</td></tr>`).join('')}
          <tr><td colspan="4" class="right muted">Sales tax ${Math.round(p.taxRate * 100)}%</td><td class="right num">${num(base * p.taxRate)}</td></tr>
          <tr><td colspan="4" class="right strong">Total (PKR)</td><td class="right num strong">${num(base * (1 + p.taxRate))}</td></tr>
        </tbody></table>
        <dl class="kv" style="margin-top:12px;"><dt>Delivery</dt><dd>By ${esc(p.due)} to Gaddafi Stadium Central Store</dd><dt>Liquidated damages</dt><dd>${esc(p.ld)}</dd><dt>Payment</dt><dd>${esc(p.terms)}</dd></dl>
      </div>`;
    },

    viewPODocument(po) {
      const p = D.purchaseOrders.find(x => x.po === po);
      this.openModal('po-doc-dialog', { title: `Purchase order ${po}`, content: this.poDocumentHTML(p) });
      const dlg = document.querySelector('#po-doc-dialog .shad-dialog');
      if (dlg) dlg.classList.add('is-wide');
    },

    renderOrdersCharts() {
      const el = document.getElementById('po-vendor-chart');
      if (!el) return;
      C.hbars(el, D.vendors.filter(v => v.status !== 'Blacklisted').map(v => ({ name: v.name.split(' (')[0], value: v.onTime, color: v.onTime < 80 ? '--chart-5' : '--chart-1' })), { fmt: v => `${v}%` });
    },

    /* ------------------------------------------------------------------
       FINANCE QUEUE (Module 10)
       ------------------------------------------------------------------ */
    renderFinanceQueue() {
      const statusBadge = (i) => i.match === 'Exception' ? badge('destructive', 'Exception', 'alert') : i.status === 'Paid' ? badge('success', 'Paid', 'check') : i.match === 'Awaiting invoice' ? badge('secondary', 'Awaiting invoice', 'clock') : badge('info', i.status, 'check');
      setHTML('fin-queue-tbody', D.invoices.map(i => `<tr class="${i.isNew ? 'is-new' : ''}" ${i.match === 'Exception' ? `onclick="app.openException('${i.inv}')"` : ''}>
        <td><div class="mono small strong">${esc(i.inv)}</div><div class="sub">${esc(i.vendor)}</div></td>
        <td class="mono small">${esc(i.po)}<div class="sub">${esc(i.grn)}</div></td>
        <td class="right num">${num(i.base)}</td>
        <td>${i.match === 'Matched' ? badge('success', 'Matched', 'check') : i.match === 'Exception' ? badge('destructive', 'Outside tolerance', 'alert') : badge('secondary', i.match)}</td>
        <td>${statusBadge(i)}${i.paidRef ? `<div class="sub mono">${esc(i.paidRef)}</div>` : ''}</td>
        <td class="right">${i.match === 'Exception' ? `<button type="button" class="shad-btn shad-btn-outline shad-btn-sm" onclick="event.stopPropagation(); app.openException('${i.inv}')">Review</button>` : ''}</td>
      </tr>`).join(''));
      D.invoices.forEach(i => delete i.isNew);
      this.renderFinanceCharts();
    },

    renderFinanceCharts() {
      const el = document.getElementById('fin-ageing-chart');
      if (!el) return;
      const A = D.analytics.ageingBuckets;
      C.bars(el, {
        labels: A.labels, height: 210, aria: 'Payables ageing',
        series: [{ name: 'Payables', color: '--chart-2', values: A.values }],
        fmt: v => (Number.isInteger(v) ? v : v.toFixed(1)), tipFmt: v => `PKR ${v.toFixed(1)}M`, totals: true
      });
    },

    openException(inv) {
      const i = D.invoices.find(x => x.inv === inv);
      const e = i.exception;
      const row = (label, po, grn, invv, bad) => `<tr><td>${label}</td><td class="right num">${po}</td><td class="right num">${grn}</td><td class="right num ${bad ? 't-danger strong' : ''}">${invv}</td></tr>`;
      this.openModal('exc-dialog', { footer: false,
        title: `Three-way match exception · ${inv}`,
        content: `<div class="callout callout-danger" style="margin-bottom:14px;">${svg('alert', 16)}<div><b>Invoice outside tolerance</b>${esc(e.note)}</div></div>
          <table class="shad-table"><thead><tr><th></th><th class="right">Purchase order</th><th class="right">Goods receipt</th><th class="right">Invoice</th></tr></thead><tbody>
            ${row('Quantity (boxes)', e.poQty, e.grnQty, e.invQty, e.invQty !== e.grnQty)}
            ${row('Unit rate (PKR)', num(e.poRate), num(e.poRate), num(e.invRate), e.invRate !== e.poRate)}
            ${row('Amount (PKR)', num(e.poQty * e.poRate), num(e.grnQty * e.poRate), num(e.invQty * e.invRate), true)}
          </tbody></table>
          <p class="small muted" style="margin-top:12px;">Payable amount is capped at the matched value (${pkr(e.grnQty * e.poRate)}) until the vendor issues a credit note or the variance is approved.</p>
          <div style="display:flex; justify-content:flex-end; gap:8px; margin-top:16px;">
            <button type="button" class="shad-btn shad-btn-outline" data-write onclick="app.resolveException('${inv}', 'credit')">Request credit note</button>
            <button type="button" class="shad-btn shad-btn-default" data-write onclick="app.resolveException('${inv}', 'cap')">Pay matched amount only</button>
          </div>`
      });
    },

    resolveException(inv, how) {
      const i = D.invoices.find(x => x.inv === inv);
      if (how === 'cap') { i.match = 'Matched'; i.status = 'Approved for payment'; i.base = i.exception.grnQty * i.exception.poRate; }
      else { i.status = 'Credit note requested'; i.match = 'Exception'; }
      this.closeDialog('exc-dialog');
      this.logAudit('Match exception resolved', `${inv}: ${how === 'cap' ? 'approved at matched value' : 'credit note requested from vendor'}.`, 'Finance Gate');
      this.renderFinanceQueue();
      this.renderOverviewPoc();
    },

    postToFinance() {
      const i = D.invoices.find(x => x.inv === 'INV-SIG-2026-9812');
      if (i && i.status !== 'Paid') {
        i.status = 'Paid'; i.paidRef = 'RTGS-HBL-26-' + (80000 + Math.floor(Math.random() * 9999)); i.isNew = true;
        this.paymentDisbursed = true;
        this.logAudit('Payment released', `INV-SIG-2026-9812: PKR 9,534,000 net to Signify Pakistan Ltd.`, 'Finance Gate', `RTGS ${i.paidRef}. Withholding PKR 378,000 deducted under ITO 2001.`);
        this.toast('Payment released', `RTGS ${i.paidRef} · PKR 9,534,000 net.`);
        this.renderFinanceQueue();
        this.renderOverviewPoc();
      } else {
        this.toast('Already paid', 'This invoice has been settled.');
      }
    }
  };

  Object.assign(PcbEnterpriseApp.prototype, M);
})();
