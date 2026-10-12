/* ==========================================================================
   PAKISTAN CRICKET BOARD (PCB) - APPLICATION CONTROLLER
   Hash-based routing, keyboard shortcuts (1-9), zero dead-ends, deep linking.
   poc-core.js and poc-screens.js extend this class with the remaining SOW
   modules and replace several renderers defined here (custody, inventory,
   indent, role switching, item master, finance release).
   ========================================================================== */

const TAB_ORDER = ['overview', 'items', 'inventory', 'custody', 'tenders', 'approvals', 'orders', 'finance', 'reports'];

class PcbEnterpriseApp {
  constructor() {
    this.currentTab = 'overview';
    this.currentTenderIndex = 0;
    this.activePlayerId = 'PCB-PLR-0056';
    this.activeStoreFilter = 'all';
    this.vaultDecrypted = false;
    this.theme = 'dark';
    this.paymentDisbursed = false;

    // Make globally accessible immediately
    window.app = this;

    this.init();
  }

  init() {
    // 1. Initial Data Rendering with try/catch safety
    try {
      this.renderOverview();
      this.renderTenders();
      this.renderInventory();
      this.renderCustody();
      this.renderFinance();
      this.renderItemMaster();
    } catch (e) {
      console.error("Initialization rendering error:", e);
    }

    // 2. Hash-based Router
    window.addEventListener('hashchange', () => this.handleHashRoute());
    if (window.location.hash) {
      this.handleHashRoute();
    } else {
      this.showTab('overview', false);
    }

    // 3. Global Keyboard Shortcuts (1-9 follow the procurement lifecycle)
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('global-search-input');
        if (input) input.focus();
        return;
      }
      // Don't intercept when user is typing in an input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
      if (e.key === 'Escape') {
        document.querySelectorAll('.shad-dialog-overlay.active').forEach(d => d.classList.remove('active'));
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const idx = parseInt(e.key, 10);
      if (idx >= 1 && idx <= TAB_ORDER.length) this.showTab(TAB_ORDER[idx - 1]);
    });

    // 4. Theme Initialization
    const savedTheme = localStorage.getItem('pcb-theme') || 'dark';
    this.setTheme(savedTheme);

    // Close dialogs when clicking the dimmed backdrop
    document.addEventListener('click', (e) => {
      if (e.target.classList && e.target.classList.contains('shad-dialog-overlay')) e.target.classList.remove('active');
    });
  }

  /* ------------------------------------------------------------------------
     HASH ROUTER & TAB SWITCHING (ZERO DEAD-ENDS)
     ------------------------------------------------------------------------ */
  handleHashRoute() {
    const rawHash = window.location.hash.replace('#', '').replace('/', '');
    const target = TAB_ORDER.includes(rawHash) ? rawHash : 'overview';
    this.showTab(target, false);
  }

  showTab(tabId, updateHash = true) {
    // Role-based access: locked screens stay closed (NFR-2)
    if (this.canAccess && this.poc && !this.canAccess(tabId)) {
      this.toast('Not available for this role', 'Switch role in the header to open this screen.');
      if (window.location.hash !== `#/${this.currentTab}`) history.replaceState(null, '', `#/${this.currentTab}`);
      return;
    }

    if (updateHash) {
      history.replaceState(null, '', `#/${tabId}`);
    }

    const changed = this.currentTab !== tabId;
    this.currentTab = tabId;

    // 1. Update Top Nav Links
    document.querySelectorAll('.shad-nav-link').forEach(link => {
      link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
    });

    // 2. Update Presentation Pills (1-6)
    document.querySelectorAll('.screen-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-tab') === tabId);
    });

    // 3. Switch Tab Panels, with a staggered entrance on the incoming screen
    document.querySelectorAll('.tab-panel').forEach(panel => {
      const active = panel.id === `tab-${tabId}`;
      panel.style.display = active ? 'block' : 'none';
      if (active && changed) {
        panel.classList.remove('is-entering');
        void panel.offsetWidth;
        panel.classList.add('is-entering');
        clearTimeout(panel._enterTimer);
        panel._enterTimer = setTimeout(() => panel.classList.remove('is-entering'), 800);
      }
    });

    // Keep the active link visible when the header nav scrolls
    const link = document.querySelector(`.shad-nav-link[data-tab="${tabId}"]`);
    if (link && link.scrollIntoView) link.scrollIntoView({ block: 'nearest', inline: 'nearest' });

    if (changed) window.scrollTo({ top: 0, behavior: 'smooth' });
    if (this.onTabShown) this.onTabShown(tabId);
  }

  /* ------------------------------------------------------------------------
     THEME TOGGLE
     ------------------------------------------------------------------------ */
  setTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pcb-theme', theme);

    const icon = document.getElementById('theme-toggle-icon');
    if (icon) {
      if (theme === 'light') {
        icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
      } else {
        icon.innerHTML = `<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>`;
      }
    }
  }

  toggleTheme() {
    const next = this.theme === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  switchRole(role) {
    const labels = {
      'director': 'Director Procurement (Approving Authority)',
      'cfo': 'Chief Financial Officer (Finance Gatekeeper)',
      'storekeeper': 'Central Storekeeper (Gaddafi Stadium)',
      'auditor': 'Director General Audit (PPRA Statutory Inspector)'
    };
    this.toast("Role Switched", labels[role]);
  }

  /* ------------------------------------------------------------------------
     SCREEN 1: OVERVIEW RENDERING
     ------------------------------------------------------------------------ */
  renderOverview() {
    // Stadium Stores Table
    const tbody = document.getElementById('overview-stores-tbody');
    if (tbody && PCB_DATA.stadiumStores) {
      tbody.innerHTML = PCB_DATA.stadiumStores.map(s => `
        <tr style="cursor:pointer;" onclick="app.filterByStoreAndNavigate('${s.id}')" title="Click to inspect ${s.name} inventory">
          <td>
            <div style="font-weight:600; display:flex; align-items:center; gap:6px;">
              <span>${s.name}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.4;"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div style="font-size:11px; color:hsl(var(--muted-foreground));">${s.city}</div>
          </td>
          <td><span class="shad-badge shad-badge-outline">${s.type}</span></td>
          <td style="font-family:var(--font-mono); font-weight:600;">${s.totalSkus.toLocaleString()}</td>
          <td style="font-family:var(--font-mono); font-weight:600; color:hsl(var(--primary));">PKR ${(s.valuationPkr / 1000000).toFixed(1)}M</td>
          <td>${s.custodian}</td>
        </tr>
      `).join('');
    }

    // Recent Audit Activity Feed
    const auditContainer = document.getElementById('overview-audit-list');
    if (auditContainer && PCB_DATA.recentActivities) {
      auditContainer.innerHTML = PCB_DATA.recentActivities.map(a => `
        <div style="display:flex; align-items:flex-start; gap:10px; font-size:12px; border-bottom:1px solid hsl(var(--border)); padding-bottom:10px; cursor:pointer;" onclick="app.inspectAudit('${a.id}')" title="Click to view full statutory audit record">
          <div style="width:6px; height:6px; border-radius:50%; background:hsl(var(--primary)); margin-top:5px; flex-shrink:0;"></div>
          <div style="flex:1;">
            <div style="font-weight:600; display:flex; align-items:center; justify-content:space-between;">
              <span>${a.title}</span>
              <span style="font-size:10px; color:hsl(var(--muted-foreground));">${a.time}</span>
            </div>
            <div style="color:hsl(var(--muted-foreground)); font-size:11px; margin-top:2px;">${a.desc}</div>
            <div style="margin-top:4px;">
              <span class="shad-badge shad-badge-secondary" style="font-size:10px;">${a.badge}</span>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  filterByStoreAndNavigate(storeId) {
    this.activeStoreFilter = storeId;
    this.showTab('inventory');
    this.renderInventory();
    const store = PCB_DATA.stadiumStores.find(s => s.id === storeId);
    if (store) {
      this.toast("Store Filter Applied", `Showing stock balances for ${store.name}`);
    }
  }

  inspectAudit(auditId) {
    const act = PCB_DATA.recentActivities.find(a => a.id === auditId);
    if (!act) return;
    this.openModal('audit-dialog', {
      title: `Statutory Audit Record: ${act.title}`,
      content: `
        <div style="font-size:13px; line-height:1.6;">
          <div style="margin-bottom:12px;"><strong>Event Ref:</strong> <span style="font-family:var(--font-mono);">${act.id}</span></div>
          <div style="margin-bottom:12px;"><strong>Timestamp:</strong> 12-Oct-2026 (${act.time})</div>
          <div style="margin-bottom:12px;"><strong>Classification:</strong> <span class="shad-badge shad-badge-outline">${act.badge}</span></div>
          <div style="margin-bottom:12px;"><strong>Verified Details:</strong><br><span style="color:hsl(var(--muted-foreground));">${act.details}</span></div>
          <div style="background:hsl(var(--muted)/0.5); padding:10px; border-radius:var(--radius); font-size:11px; font-family:var(--font-mono); color:hsl(var(--primary));">
            SHA-256 HASH: e4b29c91f0084ba3321d491c30e99812480a7114da2e8c49921f0084bc31a
          </div>
        </div>
      `
    });
  }

  /* ------------------------------------------------------------------------
     SCREEN 2: PPRA TENDERS RENDERING
     ------------------------------------------------------------------------ */
  switchTender(index) {
    this.currentTenderIndex = index;
    this.vaultDecrypted = false;
    this.renderTenders();
    this.toast("Tender Loaded", `Switched to ${PCB_DATA.tenders[index].tenderId}`);
  }

  renderTenders() {
    const tender = (PCB_DATA.tenders || PCB_DATA.activeTenders)[this.currentTenderIndex] || PCB_DATA.tenders[0];
    if (!tender) return;

    // Update Header Texts
    const titleEl = document.getElementById('tender-display-title');
    if (titleEl) titleEl.textContent = tender.title;

    const refEl = document.getElementById('tender-display-ref');
    if (refEl) refEl.textContent = tender.tenderId;

    const budgetEl = document.getElementById('tender-display-budget');
    if (budgetEl) budgetEl.textContent = `PKR ${(tender.estimatedBudgetPkr / 1000000).toFixed(1)}M`;

    // Render CST Table
    const tbody = document.getElementById('tenders-cst-tbody');
    if (tbody && tender.bidders) {
      tbody.innerHTML = tender.bidders.map(b => {
        const isWinner = b.isWinner && this.vaultDecrypted;
        const isDisq = b.techScore < 70;

        return `
          <tr style="${isWinner ? 'background:hsl(var(--gold) / 0.10); font-weight:500; box-shadow:inset 3px 0 0 hsl(var(--gold));' : ''}; cursor:pointer;" onclick="app.inspectBidder('${b.id}')" title="Click to view bidder technical scorecard">
            <td>
              ${isDisq ? '&mdash;' : `<span class="shad-badge ${isWinner ? 'shad-badge-success' : 'shad-badge-outline'}">#${b.rank}</span>`}
            </td>
            <td>
              <div style="font-weight:600; display:flex; align-items:center; gap:6px;">
                <span>${b.name}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.4;"><polyline points="9 18 15 12 9 6"/></svg>
              </div>
              <div style="font-size:11px; color:hsl(var(--muted-foreground));">${b.techStatus}</div>
            </td>
            <td>
              <span style="font-family:var(--font-mono); font-size:11px;">${b.ntn}</span>
              <div style="font-size:10px; color:hsl(var(--success));">${b.fbrStatus}</div>
            </td>
            <td>
              <span class="shad-badge ${b.techScore >= 70 ? 'shad-badge-success' : 'shad-badge-destructive'}">${b.techScore} / 100</span>
            </td>
            <td style="font-size:11px; color:hsl(var(--muted-foreground));">${b.bidSecurity}</td>
            <td style="font-family:var(--font-mono);">
              ${b.envelopeEncrypted && !this.vaultDecrypted ? '<span style="color:hsl(var(--muted-foreground));">[SEALED ENVELOPE]</span>' : (b.quotedBasePkr > 0 ? `PKR ${b.quotedBasePkr.toLocaleString()}` : '&mdash;')}
            </td>
            <td style="font-family:var(--font-mono); color:hsl(var(--muted-foreground));">
              ${b.envelopeEncrypted && !this.vaultDecrypted ? '<span style="color:hsl(var(--muted-foreground));">[SEALED ENVELOPE]</span>' : (b.salesTaxPkr > 0 ? `+ PKR ${b.salesTaxPkr.toLocaleString()}` : '&mdash;')}
            </td>
            <td style="font-family:var(--font-mono); font-weight:700; color:${isWinner ? 'hsl(var(--gold-text))' : 'inherit'};">
              ${b.envelopeEncrypted && !this.vaultDecrypted ? '<span style="color:hsl(var(--muted-foreground));">[SEALED ENVELOPE]</span>' : (b.evaluatedTotalPkr > 0 ? `PKR ${b.evaluatedTotalPkr.toLocaleString()}` : '&mdash;')}
            </td>
            <td>
              <span class="shad-badge ${isWinner ? 'shad-badge-success' : (isDisq ? 'shad-badge-destructive' : 'shad-badge-secondary')}">
                ${isWinner ? 'Lowest Evaluated Responsive' : b.evaluatedStatus}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Committee Sign-off Grid
    const commGrid = document.getElementById('committee-grid');
    if (commGrid && tender.committee) {
      commGrid.innerHTML = tender.committee.map(m => `
        <div style="background:hsl(var(--muted)/0.4); padding:12px; border-radius:var(--radius); border:1px solid hsl(var(--border)); font-size:12px;">
          <div style="font-weight:600;">${m.name}</div>
          <div style="color:hsl(var(--muted-foreground)); font-size:11px;">${m.role}</div>
          <div style="color:hsl(var(--success)); font-size:10px; font-weight:600; margin-top:4px;">&#10003; No Conflict Declared</div>
        </div>
      `).join('');
    }
  }

  decryptFinancialEnvelopes() {
    this.vaultDecrypted = true;
    const btn = document.getElementById('btn-decrypt-vault-top');
    if (btn) {
      btn.innerHTML = `<span>&#10003; Envelopes Decrypted & Evaluated</span>`;
      btn.classList.remove('shad-btn-default');
      btn.classList.add('shad-btn-secondary');
    }

    const badge = document.getElementById('cst-state-badge');
    if (badge) {
      badge.textContent = 'Envelopes Decrypted & Evaluated';
      badge.className = 'shad-badge shad-badge-success';
    }

    this.renderTenders();
    this.toast("Financial Vault Opened", "PPRA Rule 36(b): Sealed financial bids opened in presence of committee. Comparative rankings generated!");
  }

  inspectBidder(bidderId) {
    const tender = (PCB_DATA.tenders || PCB_DATA.activeTenders)[this.currentTenderIndex];
    const bidder = tender.bidders.find(b => b.id === bidderId);
    if (!bidder) return;

    this.openModal('bidder-dialog', {
      title: `Bidder Dossier: ${bidder.name}`,
      content: `
        <div style="font-size:13px; line-height:1.6;">
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
            <div><strong>NTN:</strong> <span style="font-family:var(--font-mono);">${bidder.ntn}</span></div>
            <div><strong>FBR ATL Status:</strong> <span class="shad-badge shad-badge-success">${bidder.fbrStatus}</span></div>
            <div><strong>Technical Score:</strong> <span style="font-weight:700; color:hsl(var(--success));">${bidder.techScore} / 100</span></div>
            <div><strong>Industry Experience:</strong> ${bidder.dossier.experienceYears} Years</div>
          </div>
          <div style="margin-bottom:12px;"><strong>Past Track Record:</strong><br><span style="color:hsl(var(--muted-foreground));">${bidder.dossier.pastProjects}</span></div>
          <div style="margin-bottom:12px;"><strong>Earnest Money Security:</strong><br><span style="color:hsl(var(--muted-foreground));">${bidder.bidSecurity}</span></div>
          <div style="margin-bottom:12px;"><strong>Certifications & Quality:</strong><br><span style="color:hsl(var(--muted-foreground));">${bidder.dossier.isoCertified} &bull; ${bidder.dossier.warrantyYears}</span></div>
        </div>
      `
    });
  }

  /* ------------------------------------------------------------------------
     SCREEN 3: DEMANDS & INVENTORY RENDERING
     ------------------------------------------------------------------------ */
  renderInventory(filterTerm = '') {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody || !PCB_DATA.itemsMaster) return;

    let items = PCB_DATA.itemsMaster;

    // Apply Store Filter
    if (this.activeStoreFilter !== 'all') {
      items = items.filter(item => (item.storeBreakdown && item.storeBreakdown[this.activeStoreFilter]) !== undefined);
    }

    // Apply Search Term
    if (filterTerm) {
      const term = filterTerm.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(term) || i.code.toLowerCase().includes(term));
    }

    tbody.innerHTML = items.map(i => {
      const storeStock = (i.storeBreakdown && i.storeBreakdown[this.activeStoreFilter]) !== undefined 
        ? i.storeBreakdown[this.activeStoreFilter] 
        : i.centralStock;

      return `
        <tr style="cursor:pointer;" onclick="app.inspectItem('${i.code}')" title="Click to view multi-store distribution & movements">
          <td><span style="font-family:var(--font-mono); font-size:11px;">${i.code}</span></td>
          <td>
            <div style="font-weight:600; display:flex; align-items:center; gap:6px;">
              <span>${i.name}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity:0.4;"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
            <div style="font-size:11px; color:hsl(var(--muted-foreground));">${i.spec}</div>
          </td>
          <td>
            <span class="shad-badge ${i.budgetType === 'CapEx' ? 'shad-badge-outline' : 'shad-badge-secondary'}">${i.budgetType}</span>
          </td>
          <td>${i.uom}</td>
          <td><strong style="font-family:var(--font-mono);">${i.totalStock}</strong></td>
          <td><span style="font-family:var(--font-mono); color:hsl(var(--primary)); font-weight:600;">${storeStock}</span></td>
          <td><span class="shad-badge ${i.totalStock <= i.reorderLevel ? 'shad-badge-warning' : 'shad-badge-secondary'}">${i.reorderLevel}</span></td>
          <td style="font-family:var(--font-mono);">PKR ${i.avgCostPkr.toLocaleString()}</td>
          <td>
            <button class="shad-btn shad-btn-outline shad-btn-sm" onclick="event.stopPropagation(); app.previewItemLabel('${i.code}', '${i.name}')">
              <span>QR Tag</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  filterStoreTab(storeId) {
    this.activeStoreFilter = storeId;
    document.querySelectorAll('.store-filter-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-store') === storeId);
    });
    this.renderInventory();
  }

  filterInventoryTable(query) {
    this.renderInventory(query);
  }

  inspectItem(itemCode) {
    const item = PCB_DATA.itemsMaster.find(i => i.code === itemCode);
    if (!item) return;

    this.openModal('item-drawer-dialog', {
      title: `Item Master Lifecycle: ${item.name}`,
      content: `
        <div style="font-size:13px; line-height:1.6;">
          <div style="display:flex; justify-content:space-between; margin-bottom:14px;">
            <div><strong>Code:</strong> <span style="font-family:var(--font-mono);">${item.code}</span></div>
            <div><strong>Classification:</strong> <span class="shad-badge shad-badge-outline">${item.budgetType} &bull; ${item.classification}</span></div>
          </div>
          <div style="margin-bottom:16px;">
            <strong>Multi-Store Distribution:</strong>
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; margin-top:8px;">
              <div style="background:hsl(var(--muted)/0.5); padding:8px; border-radius:var(--radius);">
                <div style="font-size:10px; color:hsl(var(--muted-foreground));">Gaddafi Central (LHR)</div>
                <div style="font-size:16px; font-weight:700; font-family:var(--font-mono);">${item.storeBreakdown ? item.storeBreakdown['STORE-LHR-01'] : 40} ${item.uom}</div>
              </div>
              <div style="background:hsl(var(--muted)/0.5); padding:8px; border-radius:var(--radius);">
                <div style="font-size:10px; color:hsl(var(--muted-foreground));">National Bank (KHI)</div>
                <div style="font-size:16px; font-weight:700; font-family:var(--font-mono);">${item.storeBreakdown ? item.storeBreakdown['STORE-KHI-01'] : 35} ${item.uom}</div>
              </div>
              <div style="background:hsl(var(--muted)/0.5); padding:8px; border-radius:var(--radius);">
                <div style="font-size:10px; color:hsl(var(--muted-foreground));">Rawalpindi Stadium</div>
                <div style="font-size:16px; font-weight:700; font-family:var(--font-mono);">${item.storeBreakdown ? item.storeBreakdown['STORE-RWP-01'] : 25} ${item.uom}</div>
              </div>
            </div>
          </div>
          <div style="display:flex; gap:10px; margin-top:16px;">
            <button class="shad-btn shad-btn-default" onclick="app.closeDialog('item-drawer-dialog'); app.openNewDemandModal();">Raise Indent for this Item</button>
            <button class="shad-btn shad-btn-outline" onclick="app.previewItemLabel('${item.code}', '${item.name}')">Print Shelf QR Label</button>
          </div>
        </div>
      `
    });
  }

  previewItemLabel(code, name) {
    this.toast("Label Print Ready", `Asset Barcode & QR Label generated for [${code}]`);
  }

  /* ------------------------------------------------------------------------
     SCREEN 4: CHAIN OF CUSTODY RENDERING
     ------------------------------------------------------------------------ */
  switchPlayer(empId) {
    this.activePlayerId = empId;
    this.renderCustody();
    const holder = PCB_DATA.custodyHolders.find(h => h.empId === empId);
    if (holder) {
      this.toast("Custodian Switched", `Viewing asset passport for ${holder.name}`);
    }
  }

  renderCustody() {
    const holder = PCB_DATA.custodyHolders.find(h => h.empId === this.activePlayerId) || PCB_DATA.custodyHolders[0];
    if (!holder) return;

    // Update Player Passport Card
    const nameEl = document.getElementById('custody-player-name');
    if (nameEl) nameEl.textContent = `${holder.name} • ${holder.empId}`;

    const roleEl = document.getElementById('custody-player-role');
    if (roleEl) roleEl.textContent = `${holder.designation} • ${holder.department}`;

    const countEl = document.getElementById('custody-player-count');
    if (countEl) countEl.textContent = `✓ ${holder.activeAssetsCount} Tracked Units Held`;

    const assetsRow = document.getElementById('custody-player-assets-row');
    if (assetsRow && holder.assets) {
      assetsRow.innerHTML = holder.assets.map(a => `
        <div style="background:hsl(var(--muted)/0.4); padding:10px 14px; border-radius:var(--radius); border:1px solid hsl(var(--border)); font-size:12px;">
          <div style="color:hsl(var(--muted-foreground)); font-size:10px;">${a.description}</div>
          <div style="font-family:var(--font-mono); font-weight:600; margin-top:2px;">${a.assetTag}</div>
        </div>
      `).join('');
    }

    // Master Table
    const tbody = document.getElementById('custody-tbody');
    if (tbody) {
      let rows = [];
      PCB_DATA.custodyHolders.forEach(h => {
        h.assets.forEach(a => {
          rows.push({
            ...a,
            holder: h.name,
            dept: h.department,
            empId: h.empId
          });
        });
      });

      tbody.innerHTML = rows.map(r => `
        <tr style="cursor:pointer;" onclick="app.switchPlayer('${r.empId}')" title="Click to view player passport">
          <td><span style="font-family:var(--font-mono); font-size:11px;">${r.assetTag}</span></td>
          <td>
            <div style="font-weight:600;">${r.description}</div>
            <div style="font-size:10px; color:hsl(var(--muted-foreground));">Item Ref: ${r.itemCode}</div>
          </td>
          <td><strong>${r.holder}</strong></td>
          <td>${r.dept}</td>
          <td>${r.issuedDate}</td>
          <td style="font-family:var(--font-mono);">PKR ${r.valuePkr.toLocaleString()}</td>
          <td><span class="shad-badge shad-badge-outline">${r.condition}</span></td>
          <td><span class="shad-badge shad-badge-success">&#10003; OTP Verified</span></td>
        </tr>
      `).join('');
    }
  }

  generateExitClearance() {
    const holder = PCB_DATA.custodyHolders.find(h => h.empId === this.activePlayerId) || PCB_DATA.custodyHolders[0];
    this.openModal('noc-dialog', {
      title: `Official PCB Exit Clearance Certificate (NOC)`,
      content: `
        <div style="font-size:13px; line-height:1.6; border:1px solid hsl(var(--border)); padding:20px; border-radius:var(--radius); background:hsl(var(--card));">
          <div style="text-align:center; border-bottom:1px solid hsl(var(--border)); padding-bottom:12px; margin-bottom:14px;">
            <div style="font-size:16px; font-weight:800; color:hsl(var(--primary));">PAKISTAN CRICKET BOARD</div>
            <div style="font-size:11px; color:hsl(var(--muted-foreground));">Gaddafi Stadium, Ferozepur Road, Lahore</div>
            <div style="font-weight:700; margin-top:6px;">NO-OBJECTION CERTIFICATE (NOC / EXIT CLEARANCE)</div>
          </div>
          <p>This is to certify that <strong>${holder.name}</strong> (${holder.designation}, Emp ID: <strong>${holder.empId}</strong>) has successfully surrendered/reconciled all assigned equipment and assets.</p>
          <div style="margin:14px 0; background:hsl(var(--muted)/0.5); padding:10px; border-radius:var(--radius); font-size:12px;">
            <strong>Verified Assets Reconciled:</strong> ${holder.activeAssetsCount} Tracked Items &bull; Status: 100% Cleared (Zero Liability).
          </div>
          <div style="display:flex; justify-content:space-between; margin-top:24px; font-size:11px;">
            <div>
              <strong>Muhammad Rashid</strong><br>
              Central Storekeeper
            </div>
            <div>
              <strong>Usman Zafar</strong><br>
              Director Procurement
            </div>
          </div>
        </div>
      `
    });
  }

  /* ------------------------------------------------------------------------
     SCREEN 5: FINANCE & 3-WAY MATCH RENDERING
     ------------------------------------------------------------------------ */
  renderFinance() {
    const rec = PCB_DATA.reconciliationRecord;
    if (!rec) return;

    // Disbursed state
    if (this.paymentDisbursed) {
      const banner = document.getElementById('reconciliation-banner');
      if (banner) {
        banner.style.borderLeft = '3px solid hsl(var(--success))';
      }
    }
  }

  postToFinance() {
    this.paymentDisbursed = true;
    this.toast("Payment Disbursed", "3-Way Match Verified (0.00% Variance). Cross RTGS disbursement voucher of PKR 9,534,000 posted to SAP/Oracle ledger!");
  }

  /* ------------------------------------------------------------------------
     SCREEN 6: ITEM MASTER CODIFICATION
     ------------------------------------------------------------------------ */
  renderItemMaster() {
    this.updateCodeDisplay();
  }

  updateCodeDisplay() {
    const cat = (document.getElementById('cat-select') || {}).value || 'SPO';
    const sub = (document.getElementById('subcat-select') || {}).value || 'BALL';
    const result = document.getElementById('code-result');
    if (result) {
      result.textContent = `PCB-${cat}-${sub}-0042`;
    }
  }

  submitNewItemCode() {
    const code = document.getElementById('code-result').textContent.trim();
    this.toast("Code Approved", `Standard Item Code ${code} registered in Central Catalogue (Module 0).`);
  }

  /* ------------------------------------------------------------------------
     MODAL & DIALOG CONTROLLER
     ------------------------------------------------------------------------ */
  openModal(modalId, options = {}) {
    let dialog = document.getElementById(modalId);
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.className = 'shad-dialog-overlay';
      dialog.id = modalId;
      dialog.innerHTML = `
        <div class="shad-dialog">
          <div class="shad-dialog-header">
            <h3 class="shad-dialog-title" id="${modalId}-title">Details</h3>
            <button class="shad-btn shad-btn-ghost shad-btn-icon" onclick="app.closeDialog('${modalId}')">&times;</button>
          </div>
          <div class="shad-dialog-content" id="${modalId}-body"></div>
          <div class="shad-dialog-footer" id="${modalId}-footer">
            <button class="shad-btn shad-btn-default" onclick="app.closeDialog('${modalId}')">Close</button>
          </div>
        </div>
      `;
      document.body.appendChild(dialog);
    }

    if (options.title) {
      const titleEl = document.getElementById(`${modalId}-title`);
      if (titleEl) titleEl.textContent = options.title;
    }
    if (options.content) {
      const bodyEl = document.getElementById(`${modalId}-body`);
      if (bodyEl) bodyEl.innerHTML = options.content;
    }
    // Form dialogs carry their own Cancel / submit buttons
    const footerEl = document.getElementById(`${modalId}-footer`);
    if (footerEl) footerEl.style.display = options.footer === false ? 'none' : '';

    dialog.classList.add('active');
  }

  closeDialog(id) {
    const dialog = document.getElementById(id);
    if (dialog) dialog.classList.remove('active');
  }

  openExportModal() {
    document.getElementById('export-dialog').classList.add('active');
  }

  openNewDemandModal() {
    document.getElementById('new-demand-dialog').classList.add('active');
  }

  openErpModal() {
    document.getElementById('erp-dialog').classList.add('active');
  }

  downloadPdfMock() {
    this.closeDialog('export-dialog');
    this.toast("PDF Export Complete", "Official PPRA Form CST-04 Comparative Statement downloaded.");
  }

  submitIndentDemo() {
    this.closeDialog('new-demand-dialog');
    this.showTab('inventory');
    this.toast("Indent Submitted", "Branch 1: 40 Units reserved at Gaddafi Store (SIN-8902). Branch 2: 60 Units routed to Procurement (PR-4401).");
  }

  /* ------------------------------------------------------------------------
     MINIMAL SHADCN TOAST
     ------------------------------------------------------------------------ */
  toast(title, message) {
    const shelf = document.getElementById('toast-shelf');
    if (!shelf) return;

    const t = document.createElement('div');
    t.style.cssText = `
      background-color: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      color: hsl(var(--card-foreground));
      padding: 10px 14px;
      border-radius: var(--radius);
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.25);
      font-size: 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 250px;
      animation: fadeIn 0.15s ease;
      z-index: 1000;
    `;
    t.innerHTML = `
      <div style="font-weight:600; color:hsl(var(--foreground));">&#10003; ${title}</div>
      <div style="color:hsl(var(--muted-foreground)); font-size:11px;">${message}</div>
    `;

    shelf.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transition = 'opacity 0.2s ease';
      setTimeout(() => t.remove(), 200);
    }, 3200);
  }
}

// Global App instantiation
const app = new PcbEnterpriseApp();
