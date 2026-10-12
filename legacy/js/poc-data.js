/* ==========================================================================
   PCB POC - EXTENDED DATASET
   Adds the records behind Approvals (M7), PO & GRN (M8/M9), Reports (M11),
   custody lifecycle (M3), sourcing (M5) and role-based access.
   All figures are illustrative sample data for the proof of concept.
   ========================================================================== */

Object.assign(PCB_DATA, {

  today: '13-Oct-2026',

  /* ---------------- Analytics series (FY 2026-27, PKR millions) ---------------- */
  analytics: {
    months: ['Jul', 'Aug', 'Sep', 'Oct'],
    monthLabels: ['Jul 2026', 'Aug 2026', 'Sep 2026', 'Oct 2026 (to date)'],
    committedCapex: [17.6, 21.0, 27.9, 9.5],
    committedOpex: [10.4, 12.3, 16.4, 8.7],
    monthlyPlan: 20.1,
    stockValue: [131.2, 136.8, 139.5, 142.8],
    cycleDays: [41, 38, 34, 29],
    cycleTarget: 30,
    slaOnTime: [78, 82, 85, 88],
    openDemands: [171, 166, 158, 142],
    activeTenders: [3, 4, 6, 5],
    pipeline: [
      { stage: 'Demands raised', n: 186, tab: 'inventory' },
      { stage: 'Fulfilled from stock', n: 97, tab: 'inventory' },
      { stage: 'Routed to procurement', n: 89, tab: 'inventory' },
      { stage: 'Tenders / RFQs', n: 31, tab: 'tenders' },
      { stage: 'Approved for award', n: 22, tab: 'approvals' },
      { stage: 'Purchase orders', n: 20, tab: 'orders' },
      { stage: 'Goods received', n: 16, tab: 'orders' },
      { stage: 'Paid', n: 13, tab: 'finance' }
    ],
    approvalHoursByType: [
      { name: 'Demand', value: 14 },
      { name: 'Purchase requisition', value: 31 },
      { name: 'Comparative statement', value: 62 },
      { name: 'Purchase order', value: 19 },
      { name: 'Item code', value: 9 }
    ],
    ageingBuckets: { labels: ['0–15 days', '16–30 days', '31–45 days', '45+ days'], values: [17.7, 6.4, 2.1, 0.9] }
  },

  /* ---------------- Roles & access (NFR-2, FR-11.6) ---------------- */
  roles: {
    director:    { label: 'Director Procurement', user: 'Usman Zafar', initials: 'UZ', tabs: 'all', readOnly: false },
    committee:   { label: 'Procurement Committee Member', user: 'Engr. Farhan Ali', initials: 'FA', tabs: ['overview', 'items', 'tenders', 'approvals', 'reports'], readOnly: false },
    cfo:         { label: 'Chief Financial Officer', user: 'Tariq Mehmood', initials: 'TM', tabs: ['overview', 'tenders', 'approvals', 'orders', 'finance', 'reports'], readOnly: false },
    storekeeper: { label: 'Central Storekeeper', user: 'Muhammad Rashid', initials: 'MR', tabs: ['overview', 'items', 'inventory', 'custody', 'orders', 'reports'], readOnly: false },
    auditor:     { label: 'Statutory Auditor (read-only)', user: 'DG Audit Office', initials: 'AU', tabs: 'all', readOnly: true }
  },

  /* ---------------- Budget heads (FR-1.8, FR-8.5) ---------------- */
  budgetHeads: [
    { id: 'BH-CAP-INF', name: 'Stadium Infrastructure CapEx (PC-1)', type: 'CapEx', allocation: 120000000, committed: 63000000, spent: 41200000 },
    { id: 'BH-CAP-BRD', name: 'Broadcast & Technology CapEx', type: 'CapEx', allocation: 45000000, committed: 13000000, spent: 9750000 },
    { id: 'BH-OPX-CRK', name: 'Cricket Operations OpEx', type: 'OpEx', allocation: 38000000, committed: 26400000, spent: 19100000 },
    { id: 'BH-OPX-HPC', name: 'High Performance Centre OpEx', type: 'OpEx', allocation: 22000000, committed: 9600000, spent: 7300000 },
    { id: 'BH-OPX-GRD', name: 'Grounds & Pitches OpEx', type: 'OpEx', allocation: 16000000, committed: 11800000, spent: 8900000 }
  ],

  /* ---------------- Procurement method thresholds (FR-5.1) ---------------- */
  methodThresholds: [
    { max: 100000, method: 'Petty Purchase', docs: 'Single quotation, cash memo', advert: 'Not required', minDays: 0 },
    { max: 3000000, method: 'Request for Quotations (RFQ)', docs: 'Minimum 3 written quotations', advert: 'Not required', minDays: 7 },
    { max: Infinity, method: 'Open Competitive Bidding', docs: 'Standard Bidding Document, single- or two-stage', advert: 'PPRA website + national newspaper', minDays: 15 }
  ],

  /* ---------------- Approval matrix / DFP (FR-7.1) ---------------- */
  approvalMatrix: [
    { band: 'B1', range: 'Up to PKR 100,000', chain: ['Head of Department'] },
    { band: 'B2', range: 'PKR 100,001 – 3,000,000', chain: ['Head of Department', 'Director Procurement'] },
    { band: 'B3', range: 'PKR 3,000,001 – 20,000,000', chain: ['Head of Department', 'Director Procurement', 'CFO'] },
    { band: 'B4', range: 'PKR 20,000,001 – 50,000,000', chain: ['Director Procurement', 'CFO', 'COO'] },
    { band: 'B5', range: 'Above PKR 50,000,000', chain: ['Procurement Committee', 'Director Procurement', 'CFO', 'Chairman PCB'] }
  ],

  delegation: { active: true, from: 'Chief Operating Officer', to: 'CFO (Tariq Mehmood)', period: '10 – 18 Oct 2026', reason: 'Official travel (ICC meeting, Dubai)' },

  /* ---------------- Approvals inbox (FR-7.1 – 7.3) ---------------- */
  approvals: [
    {
      id: 'APR-2026-0186', type: 'Comparative Statement', ref: 'PCB/LOG-PSL10/2026/089',
      title: 'Award recommendation: LED floodlights, Gaddafi Stadium (Signify Pakistan)',
      amount: 56876000, band: 'B5', dept: 'Procurement Wing', requestedBy: 'Procurement Committee', submitted: '09-Oct-2026',
      slaHours: 72, elapsedHours: 79, status: 'pending', linkTender: 0,
      chain: [
        { role: 'Procurement Committee', name: '4 members', status: 'approved', at: '09-Oct 16:40', remark: 'Lowest evaluated responsive bidder. All 4 members signed, no conflicts declared.' },
        { role: 'Director Procurement', name: 'Usman Zafar', status: 'pending', roleKey: 'director' },
        { role: 'CFO', name: 'Tariq Mehmood', status: 'waiting', roleKey: 'cfo' },
        { role: 'Chairman PCB', name: 'Chairman', status: 'waiting' }
      ]
    },
    {
      id: 'APR-2026-0188', type: 'Purchase Requisition', ref: 'PR-AUTO-4401',
      title: '60 boxes Kookaburra white match balls (balance of REQ-2026-1044)',
      amount: 11100000, band: 'B3', dept: 'High Performance Centre', requestedBy: 'Bilal Hasan', submitted: '10-Oct-2026',
      slaHours: 48, elapsedHours: 41, status: 'pending',
      chain: [
        { role: 'Head of Department', name: 'Mudassar Nazar', status: 'approved', at: '10-Oct 14:20', remark: 'Needed for NCA camp starting 1 Nov.' },
        { role: 'Director Procurement', name: 'Usman Zafar', status: 'pending', roleKey: 'director' },
        { role: 'CFO', name: 'Tariq Mehmood', status: 'waiting', roleKey: 'cfo' }
      ]
    },
    {
      id: 'APR-2026-0181', type: 'Vendor Blacklisting', ref: 'VND-0412',
      title: 'Debar Apex Engineering Consortium for 2 years (forged experience certificate)',
      amount: null, band: '—', dept: 'Procurement Wing', requestedBy: 'Procurement Committee', submitted: '11-Oct-2026',
      slaHours: 120, elapsedHours: 30, status: 'pending', linkVendor: 'VND-0412',
      chain: [
        { role: 'Procurement Committee', name: '4 members', status: 'approved', at: '11-Oct 11:05', remark: 'Certificate verified as forged with issuing authority (NESPAK letter ref 2026/441).' },
        { role: 'Director Procurement', name: 'Usman Zafar', status: 'pending', roleKey: 'director' }
      ]
    },
    {
      id: 'APR-2026-0184', type: 'Item Code Request', ref: 'PCB-MED-REC-0015',
      title: 'New code: Normatec 3 recovery boots (physio)',
      amount: null, band: '—', dept: 'High Performance Centre', requestedBy: 'Dr. Asadullah', submitted: '12-Oct-2026',
      slaHours: 24, elapsedHours: 5, status: 'pending',
      chain: [
        { role: 'Catalogue Officer', name: 'Saima Khan', status: 'approved', at: '12-Oct 09:10', remark: 'No duplicate found in MED-REC.' },
        { role: 'Director Procurement', name: 'Usman Zafar', status: 'pending', roleKey: 'director' }
      ]
    },
    {
      id: 'APR-2026-0179', type: 'Demand', ref: 'REQ-2026-1051',
      title: 'Rain covers and pitch sheets (8 sets) for Multan Cricket Stadium',
      amount: 2240000, band: 'B2', dept: 'Grounds & Pitches', requestedBy: 'Usman Zafar', submitted: '11-Oct-2026',
      slaHours: 48, elapsedHours: 18, status: 'pending', sodBlocked: true,
      chain: [
        { role: 'Head of Department', name: 'Agha Zahid', status: 'approved', at: '11-Oct 15:00', remark: 'Monsoon damage replacement.' },
        { role: 'Director Procurement', name: 'Usman Zafar', status: 'pending', roleKey: 'director' }
      ]
    },
    {
      id: 'APR-2026-0175', type: 'PO Amendment', ref: 'PO-PCB-2026-0298',
      title: 'Extend Hawk-Eye sensor delivery by 14 days (customs hold)',
      amount: 0, band: 'B4', dept: 'Broadcast & Tech', requestedBy: 'Imran Siddiqui', submitted: '07-Oct-2026',
      slaHours: 72, elapsedHours: 96, status: 'returned',
      chain: [
        { role: 'Director Procurement', name: 'Usman Zafar', status: 'returned', at: '08-Oct 10:30', remark: 'Attach customs detention letter and vendor undertaking on LD waiver.' }
      ]
    },
    {
      id: 'APR-2026-0170', type: 'Purchase Order', ref: 'PO-PCB-2026-0324',
      title: '80 boxes Kookaburra balls, framework call-off',
      amount: 17180800, band: 'B3', dept: 'Cricket Operations', requestedBy: 'Bilal Hasan', submitted: '25-Sep-2026',
      slaHours: 48, elapsedHours: 20, status: 'approved',
      chain: [
        { role: 'Director Procurement', name: 'Usman Zafar', status: 'approved', at: '26-Sep 09:15', remark: 'Within framework rates.' },
        { role: 'CFO', name: 'Tariq Mehmood', status: 'approved', at: '26-Sep 12:40', remark: 'Budget available.' }
      ]
    }
  ],

  /* ---------------- Intention to Award & grievances (FR-7.4) ---------------- */
  intentions: [
    { tenderIdx: 1, tender: 'PCB/LOG-SPO/2026/041', title: 'Kookaburra white balls, framework contract', bidder: 'CA Sports Sialkot', published: '06-Oct-2026', expires: '16-Oct-2026 17:00', days: 10, elapsed: 6, grievances: 0 }
  ],
  grievances: [
    { id: 'GRV-2026-007', tender: 'PCB/INF-GRD/2026/052', subject: 'Rain covers and pitch sheets', complainant: 'Diamond Tarpaulin Industries', filed: '02-Oct-2026', ground: 'Technical criteria favoured a single brand', committee: 'Grievance Redressal Committee (3)', hearing: '09-Oct-2026', status: 'Decision due 16-Oct' },
    { id: 'GRV-2026-005', tender: 'PCB/APP-KIT/2026/017', subject: 'Domestic team kits', complainant: 'Stitch Pro Garments', filed: '18-Aug-2026', ground: 'Bid security wrongly declared invalid', committee: 'Grievance Redressal Committee (3)', hearing: '25-Aug-2026', status: 'Closed: complaint rejected' }
  ],

  /* ---------------- Demands register (FR-1.1 – 1.8) ---------------- */
  demands: [
    { id: 'REQ-2026-1044', date: '10-Oct-2026', dept: 'High Performance Centre', by: 'Bilal Hasan', itemCode: 'PCB-SPO-BALL-0042', qty: 100, issued: 40, prQty: 60, branch: 'partial', sin: 'SIN-LHR-8902', pr: 'PR-AUTO-4401', requiredBy: '01-Nov-2026', purpose: 'NCA pre-season camp', budgetHead: 'BH-OPX-HPC', status: 'Part issued, PR in approval' },
    { id: 'REQ-2026-1051', date: '11-Oct-2026', dept: 'Grounds & Pitches', by: 'Usman Zafar', itemCode: 'PCB-GRD-CVR-0004', qty: 8, issued: 0, prQty: 8, branch: 'none', pr: 'PR-AUTO-4407', requiredBy: '15-Nov-2026', purpose: 'Monsoon damage replacement, Multan', budgetHead: 'BH-OPX-GRD', status: 'PR in approval' },
    { id: 'REQ-2026-1039', date: '04-Oct-2026', dept: "Women's National Team", by: 'Sana Mir', itemCode: 'PCB-APP-KIT-0091', qty: 2, issued: 2, prQty: 0, branch: 'full', sin: 'SIN-LHR-8871', requiredBy: '06-Oct-2026', purpose: 'Asia Cup squad kits', budgetHead: 'BH-OPX-CRK', status: 'Fulfilled from stock' },
    { id: 'REQ-2026-1032', date: '28-Sep-2026', dept: 'Grounds & Pitches', by: 'Hafiz Shabbir', itemCode: 'PCB-INF-LGT-0018', qty: 110, issued: 0, prQty: 110, branch: 'none', pr: 'PR-2026-0389', requiredBy: '15-Dec-2026', purpose: 'Gaddafi floodlight upgrade', budgetHead: 'BH-CAP-INF', status: 'Tender 089 in evaluation' }
  ],

  /* ---------------- Item ledgers, Gaddafi Central Store (FR-2.3, FR-11.2) ---------------- */
  // type: OPEN | GRN | ISSUE | TRANSFER_OUT | TRANSFER_IN | RETURN | ADJUST
  itemLedgers: {
    'PCB-SPO-BALL-0042': {
      opening: { date: '01-Jul-2026', qty: 60, unitCost: 186000 },
      entries: [
        { date: '08-Jul-2026', type: 'GRN', ref: 'GRN-LHR-2026-0377', doc: 'PO-PCB-2026-0261', qty: 60, unitCost: 182000, party: 'CA Sports Sialkot', purpose: 'Framework call-off 1' },
        { date: '15-Jul-2026', type: 'ISSUE', ref: 'SIN-LHR-8611', doc: 'REQ-2026-0912', qty: -30, party: "Men's National Team", custodian: 'Bilal Hasan', recipient: 'Team Manager', purpose: 'England series preparation camp' },
        { date: '02-Aug-2026', type: 'ISSUE', ref: 'SIN-LHR-8703', doc: 'REQ-2026-0955', qty: -25, party: 'High Performance Centre', custodian: 'Dr. Asadullah', recipient: 'U-19 Head Coach', purpose: 'U-19 summer camp' },
        { date: '19-Aug-2026', type: 'TRANSFER_OUT', ref: 'TRF-2026-0045', doc: 'To STORE-KHI-01', qty: -20, party: 'National Bank Stadium store', purpose: 'Karachi Test match allocation' },
        { date: '05-Sep-2026', type: 'ISSUE', ref: 'SIN-LHR-8790', doc: 'REQ-2026-1003', qty: -38, party: 'Domestic Cricket Operations', custodian: 'Junaid Zia', recipient: 'Tournament Director', purpose: 'Quaid-e-Azam Trophy, round 1' },
        { date: '22-Sep-2026', type: 'RETURN', ref: 'RET-LHR-0112', doc: 'SIN-LHR-8790', qty: 3, party: 'Domestic Cricket Operations', purpose: 'Unused sealed boxes returned' },
        { date: '08-Oct-2026', type: 'GRN', ref: 'GRN-LHR-2026-0503', doc: 'PO-PCB-2026-0324', qty: 40, unitCost: 182000, party: 'CA Sports Sialkot', purpose: 'Framework call-off 2 (part delivery)' },
        { date: '11-Oct-2026', type: 'ISSUE', ref: 'SIN-LHR-8899', doc: 'REQ-2026-1040', qty: -10, party: "Women's National Team", custodian: 'Bilal Hasan', recipient: 'Team Manager', purpose: 'Asia Cup camp' }
      ]
    },
    'PCB-INF-LGT-0018': {
      opening: { date: '01-Jul-2026', qty: 6, unitCost: 435000 },
      entries: [
        { date: '12-Aug-2026', type: 'ISSUE', ref: 'SIN-LHR-8722', doc: 'REQ-2026-0971', qty: -6, party: 'Grounds & Infrastructure', custodian: 'Engr. Farhan Ali', recipient: 'Electrical Foreman', purpose: 'Replace failed lamps, Tower 3' },
        { date: '04-Oct-2026', type: 'GRN', ref: 'GRN-LHR-2026-0491', doc: 'PO-PCB-2026-0312', qty: 20, unitCost: 420000, party: 'Signify Pakistan Ltd', purpose: 'Batch 1 luminaires' }
      ]
    },
    'PCB-TRF-MOW-0007': {
      opening: { date: '01-Jul-2026', qty: 2, unitCost: 4850000 },
      entries: [
        { date: '20-Aug-2026', type: 'ISSUE', ref: 'SIN-LHR-8740', doc: 'REQ-2026-0980', qty: -1, party: 'Grounds & Pitches', custodian: 'Hafiz Shabbir', recipient: 'Head Groundsman, Multan', purpose: 'Season pitch preparation', returnable: true },
        { date: '25-Sep-2026', type: 'RETURN', ref: 'RET-LHR-0118', doc: 'SIN-LHR-8740', qty: 1, party: 'Grounds & Pitches', purpose: 'Returned after season' }
      ]
    },
    'PCB-APP-KIT-0091': {
      opening: { date: '01-Jul-2026', qty: 20, unitCost: 320000 },
      entries: [
        { date: '10-Jul-2026', type: 'ISSUE', ref: 'SIN-LHR-8602', doc: 'REQ-2026-0901', qty: -6, party: "Men's National Team", custodian: 'Bilal Hasan', recipient: 'Kit Manager', purpose: 'England tour kits' },
        { date: '28-Aug-2026', type: 'ISSUE', ref: 'SIN-LHR-8761', doc: 'REQ-2026-0990', qty: -4, party: "Women's National Team", custodian: 'Bilal Hasan', recipient: 'Kit Manager', purpose: 'South Africa series' },
        { date: '14-Sep-2026', type: 'GRN', ref: 'GRN-LHR-2026-0459', doc: 'PO-PCB-2026-0288', qty: 6, unitCost: 325000, party: 'AJ Sports Lahore', purpose: 'Replenishment' },
        { date: '03-Oct-2026', type: 'ISSUE', ref: 'SIN-LHR-8862', doc: 'REQ-2026-1029', qty: -8, party: 'PSL Operations', custodian: 'Junaid Zia', recipient: 'Franchise liaison', purpose: 'PSL draft event' }
      ]
    },
    'PCB-MED-REC-0014': {
      opening: { date: '01-Jul-2026', qty: 4, unitCost: 1450000 },
      entries: [
        { date: '18-Sep-2026', type: 'ISSUE', ref: 'SIN-LHR-8811', doc: 'REQ-2026-1011', qty: -1, party: 'High Performance Centre', custodian: 'Dr. Asadullah', recipient: 'Lead Physiotherapist', purpose: 'Rehab unit, NCA', returnable: true },
        { date: '30-Sep-2026', type: 'RETURN', ref: 'RET-LHR-0121', doc: 'SIN-LHR-8811', qty: 1, party: 'High Performance Centre', purpose: 'Rehab programme completed' }
      ]
    },
    'PCB-BRD-HWK-0003': {
      opening: { date: '01-Jul-2026', qty: 3, unitCost: 3250000 },
      entries: [
        { date: '05-Aug-2026', type: 'TRANSFER_OUT', ref: 'TRF-2026-0039', doc: 'To STORE-RWP-01', qty: -1, party: 'Rawalpindi Cricket Stadium store', purpose: 'Rawalpindi Test broadcast' },
        { date: '28-Aug-2026', type: 'TRANSFER_IN', ref: 'TRF-2026-0047', doc: 'From STORE-RWP-01', qty: 1, party: 'Rawalpindi Cricket Stadium store', purpose: 'Returned after Test' }
      ]
    }
  },

  assetAttributes: {
    'PCB-INF-LGT-0018': { warranty: '5 years', usefulLife: '12 years', depreciation: 'Straight-line 8.33% p.a.', tagRequired: true },
    'PCB-TRF-MOW-0007': { warranty: '2 years', usefulLife: '8 years', depreciation: 'Straight-line 12.5% p.a.', tagRequired: true },
    'PCB-MED-REC-0014': { warranty: '3 years', usefulLife: '6 years', depreciation: 'Straight-line 16.67% p.a.', tagRequired: true },
    'PCB-BRD-HWK-0003': { warranty: '3 years', usefulLife: '7 years', depreciation: 'Straight-line 14.29% p.a.', tagRequired: true }
  },

  stockTake: {
    id: 'ST-2026-Q2-LHR', store: 'Gaddafi Stadium Central Store', date: '09-Oct-2026', countedBy: 'Muhammad Rashid, Naveed Akram', status: 'Awaiting approval',
    lines: [
      { code: 'PCB-SPO-BALL-0042', book: 40, counted: 40 },
      { code: 'PCB-INF-LGT-0018', book: 20, counted: 20 },
      { code: 'PCB-APP-KIT-0091', book: 8, counted: 7 },
      { code: 'PCB-MED-REC-0014', book: 4, counted: 4 },
      { code: 'PCB-BRD-HWK-0003', book: 3, counted: 3 },
      { code: 'PCB-TRF-MOW-0007', book: 2, counted: 2 }
    ]
  },

  deadStock: [
    { code: 'PCB-SPO-SCR-0003', name: 'Manual scoreboard numeral set', store: 'Multan Cricket Stadium', qty: 4, value: 260000, lastMovement: '14-Feb-2025', days: 605 },
    { code: 'PCB-IT-PRJ-0001', name: 'Epson EB-2250U projector', store: 'National Cricket Academy', qty: 3, value: 345000, lastMovement: '20-Nov-2025', days: 326 },
    { code: 'PCB-SPO-BWM-0011', name: 'Bowling machine feeder (legacy model)', store: 'Rawalpindi Cricket Stadium', qty: 2, value: 780000, lastMovement: '02-Mar-2026', days: 224 }
  ],

  /* ---------------- Vendors (Module 4) ---------------- */
  vendors: [
    { id: 'VND-0101', name: 'Signify Pakistan Ltd (Philips Lighting)', ntn: '1428901-4', category: 'Floodlighting', atl: true, prequal: 94, rating: 4.9, onTime: 96, defects: 0.4, status: 'Eligible', nextDoc: 'Chamber membership', nextExpiry: '30-Jun-2027', expiryDays: 261, pos: 3, value: 18400000, pending: 0 },
    { id: 'VND-0144', name: 'CA Sports Sialkot (Kookaburra agent)', ntn: '0492104-9', category: 'Match balls', atl: true, prequal: 96, rating: 5.0, onTime: 92, defects: 0.0, status: 'Eligible', nextDoc: 'STRN certificate', nextExpiry: '31-Oct-2026', expiryDays: 19, pos: 4, value: 34360000, pending: 1 },
    { id: 'VND-0159', name: 'Musco Stadium Lighting International', ntn: '0891230-2', category: 'Floodlighting', atl: true, prequal: 91, rating: 4.8, onTime: 100, defects: 0.0, status: 'Eligible', nextDoc: 'NTN certificate', nextExpiry: '15-Mar-2027', expiryDays: 154, pos: 1, value: 6200000, pending: 0 },
    { id: 'VND-0203', name: 'Pak Agro Machinery (John Deere dealer)', ntn: '3021187-6', category: 'Turf machinery', atl: true, prequal: 88, rating: 4.1, onTime: 71, defects: 1.2, status: 'Eligible', nextDoc: 'Registration certificate', nextExpiry: '12-Jan-2027', expiryDays: 92, pos: 2, value: 9800000, pending: 1 },
    { id: 'VND-0230', name: 'Sports Tech PK (Hawk-Eye partner)', ntn: '4410923-1', category: 'Broadcast tech', atl: true, prequal: 90, rating: 4.4, onTime: 85, defects: 0.8, status: 'Eligible', nextDoc: 'Chamber membership', nextExpiry: '28-Feb-2027', expiryDays: 139, pos: 1, value: 13000000, pending: 1 },
    { id: 'VND-0412', name: 'Apex Engineering Consortium', ntn: '2198031-1', category: 'Civil & electrical', atl: false, prequal: 62, rating: 3.2, onTime: 58, defects: 4.6, status: 'Blacklisting proposed', nextDoc: 'Tax return (FY26)', nextExpiry: 'Overdue', expiryDays: -12, pos: 2, value: 3100000, pending: 0 }
  ],

  /* ---------------- Purchase orders (Module 8) ---------------- */
  purchaseOrders: [
    { po: 'PO-PCB-2026-0324', date: '26-Sep-2026', vendor: 'CA Sports Sialkot', vendorId: 'VND-0144', source: 'Framework PCB/LOG-SPO/2026/030', itemCode: 'PCB-SPO-BALL-0042', item: 'Kookaburra white match balls (box of 12)', qty: 80, received: 40, unitPrice: 182000, taxRate: 0.18, budgetHead: 'BH-OPX-CRK', due: '20-Oct-2026', ld: '0.1% per day, max 10%', terms: 'Net 30 days after GRN', status: 'Partially received' },
    { po: 'PO-PCB-2026-0298', date: '02-Sep-2026', vendor: 'Sports Tech PK (Hawk-Eye partner)', vendorId: 'VND-0230', source: 'Direct contracting (sole source, recorded)', itemCode: 'PCB-BRD-HWK-0003', item: 'Hawk-Eye pitch calibration sensors', qty: 4, received: 0, unitPrice: 3250000, taxRate: 0.18, budgetHead: 'BH-CAP-BRD', due: '25-Oct-2026', ld: '0.1% per day, max 10%', terms: '30% advance against bank guarantee, 70% on GRN', status: 'In transit' },
    { po: 'PO-PCB-2026-0317', date: '10-Sep-2026', vendor: 'Pak Agro Machinery (John Deere dealer)', vendorId: 'VND-0203', source: 'RFQ-2026-0102', itemCode: 'PCB-TRF-MOW-0007', item: 'John Deere 8000 E-Cut hybrid mower', qty: 2, received: 0, unitPrice: 4900000, taxRate: 0.18, budgetHead: 'BH-CAP-INF', due: '05-Oct-2026', ld: '0.1% per day, max 10%', terms: 'Net 30 days after GRN', status: 'Overdue' },
    { po: 'PO-PCB-2026-0312', date: '14-Sep-2026', vendor: 'Signify Pakistan Ltd', vendorId: 'VND-0101', source: 'PCB/INF-LGT/2026/033', itemCode: 'PCB-INF-LGT-0018', item: 'Philips ArenaVision LED luminaire 1500W', qty: 20, received: 20, unitPrice: 420000, taxRate: 0.18, budgetHead: 'BH-CAP-INF', due: '30-Sep-2026', ld: '0.1% per day, max 10%', terms: 'Net 30 days after GRN', status: 'Fully received' }
  ],
  grns: [
    { grn: 'GRN-LHR-2026-0503', po: 'PO-PCB-2026-0324', date: '08-Oct-2026', qty: 40, accepted: 40, rejected: 0, inspector: 'Bilal Hasan', remark: 'Seals intact, batch K26-114' },
    { grn: 'GRN-LHR-2026-0491', po: 'PO-PCB-2026-0312', date: '04-Oct-2026', qty: 20, accepted: 20, rejected: 0, inspector: 'Engr. Farhan Ali', remark: 'Photometric calibration certified' }
  ],

  /* ---------------- Finance queue (Module 10) ---------------- */
  invoices: [
    { inv: 'INV-SIG-2026-9812', po: 'PO-PCB-2026-0312', grn: 'GRN-LHR-2026-0491', vendor: 'Signify Pakistan Ltd', base: 8400000, received: '06-Oct-2026', match: 'Matched', status: 'Approved for payment', ageing: 6 },
    { inv: 'INV-CAS-2026-0441', po: 'PO-PCB-2026-0324', grn: 'GRN-LHR-2026-0503', vendor: 'CA Sports Sialkot', base: 7770000, received: '10-Oct-2026', match: 'Exception', status: 'Routed to Procurement', ageing: 2,
      exception: { poQty: 40, grnQty: 40, invQty: 42, poRate: 182000, invRate: 185000, note: 'Invoice bills 42 boxes at PKR 185,000. GRN accepted 40 boxes at the PO rate of PKR 182,000. Quantity variance +2, rate variance +1.65% (tolerance 1.0%).' } },
    { inv: 'INV-AJS-2026-0217', po: 'PO-PCB-2026-0288', grn: 'GRN-LHR-2026-0459', vendor: 'AJ Sports Lahore', base: 1950000, received: '16-Sep-2026', match: 'Matched', status: 'Paid', paidRef: 'RTGS-HBL-26-77120', ageing: 0 }
  ],

  /* ---------------- Sourcing (Module 5) ---------------- */
  sbdTemplates: [
    { name: 'PPRA Standard Bidding Document: Goods (single stage, two envelope)', version: 'v4.2', updated: '01-Jul-2026', status: 'Approved' },
    { name: 'PPRA Standard Bidding Document: Works', version: 'v3.0', updated: '15-Mar-2026', status: 'Approved' },
    { name: 'PCB RFQ template: Goods under PKR 3M', version: 'v2.1', updated: '20-May-2026', status: 'Approved' },
    { name: 'PCB framework agreement template', version: 'v1.4', updated: '02-Feb-2026', status: 'Approved' }
  ],
  sbdComments: [
    { by: 'Engr. Farhan Ali', role: 'Committee member', at: '18-Sep 11:20', text: 'Clause 4.3: raise minimum TLCI from 85 to 90 for 4K broadcast.' },
    { by: 'Tariq Mehmood', role: 'Committee member', at: '18-Sep 15:05', text: 'Agree. Also add 5-year on-site warranty as a responsiveness criterion.' },
    { by: 'Usman Zafar', role: 'Chair', at: '19-Sep 09:40', text: 'Both changes accepted in v4.2-PCB-089. Ready for sign-off.' }
  ],
  rfq: {
    id: 'RFQ-2026-0117', title: 'Pitch rollers (2) and turf seed (600 kg) for Multan', estValue: 1850000, itemCode: 'PCB-TRF-ROL-0002', closes: '19-Oct-2026',
    vendorIds: ['VND-0203', 'VND-0144', 'VND-0159', 'VND-0412'],
    quoteBook: [
      { vendorId: 'VND-0203', base: 1720000, delivery: '3 weeks', validity: '90 days' },
      { vendorId: 'VND-0159', base: 1810000, delivery: '5 weeks', validity: '60 days' },
      { vendorId: 'VND-0144', base: 1765000, delivery: '4 weeks', validity: '90 days' }
    ]
  },
  bidTerms: {
    'BID-01': { delivery: '14 weeks', warranty: '5 years on-site', payment: '10% advance, 90% on commissioning' },
    'BID-02': { delivery: '18 weeks', warranty: '10 years', payment: '20% advance, 80% on commissioning' },
    'BID-03': { delivery: '16 weeks', warranty: '3 years', payment: 'Net 30 after commissioning' },
    'BID-04': { delivery: '—', warranty: '1 year', payment: '—' },
    'BID-T2-01': { delivery: '2 weeks per call-off', warranty: 'Batch quality guarantee', payment: 'Net 30 after GRN' }
  },
  guarantees: [
    { type: 'Bid security', bidder: 'Signify Pakistan Ltd', instrument: 'HBL bank guarantee HBL-BG-2026-9921', amount: 1200000, validity: '10-Jan-2027', status: 'Held' },
    { type: 'Bid security', bidder: 'Musco Stadium Lighting', instrument: 'MCB bank guarantee MCB-BG-4412', amount: 1250000, validity: '10-Jan-2027', status: 'Held' },
    { type: 'Bid security', bidder: 'Osram Asia', instrument: 'Meezan CDR MEZ-CDR-1192', amount: 1220000, validity: '10-Jan-2027', status: 'Held' },
    { type: 'Bid security', bidder: 'Apex Engineering Consortium', instrument: 'BOP CDR BOP-CDR-0912', amount: 1200000, validity: '10-Jan-2027', status: 'Release on award' },
    { type: 'Performance guarantee', bidder: 'CA Sports Sialkot', instrument: 'Allied Bank PG ABL-PG-2026-310', amount: 1735000, validity: '30-Jun-2027', status: 'Held' }
  ],

  /* ---------------- Custody (Module 3) ---------------- */
  departmentCustodians: [
    { dept: "Men's National Cricket Team", custodian: 'Bilal Hasan', holders: 2, items: 7 },
    { dept: 'Grounds & Pitches Infrastructure', custodian: 'Hafiz Shabbir', holders: 1, items: 2 },
    { dept: 'Logistics & Store Custody Wing', custodian: 'Bilal Hasan', holders: 1, items: 2 },
    { dept: 'High Performance Centre', custodian: 'Dr. Asadullah', holders: 3, items: 5 }
  ],
  custodyMeta: {
    'PCB-AST-SEN-0042': { purpose: 'Batting technique analysis', location: 'NCA Lahore', returnable: true, expectedReturn: '31-Dec-2026', lifecycle: 'In Use', ack: 'Confirmed' },
    'PCB-AST-GPS-0012': { purpose: 'Workload monitoring', location: 'Team hotel / venue', returnable: true, expectedReturn: '31-Mar-2027', lifecycle: 'In Use', ack: 'Confirmed' },
    'PCB-AST-TAB-0089': { purpose: 'Video analysis', location: 'Touring', returnable: true, expectedReturn: '31-Mar-2027', lifecycle: 'Issued', ack: 'Pending', ackHours: 54 },
    'PCB-AST-BAG-0112': { purpose: 'Personal kit transport', location: 'Touring', returnable: false, expectedReturn: '—', lifecycle: 'In Use', ack: 'Confirmed' },
    'PCB-AST-SLV-0008': { purpose: 'Bowling load biomechanics', location: 'NCA Lahore', returnable: true, expectedReturn: '31-Dec-2026', lifecycle: 'Under Repair', ack: 'Confirmed' },
    'PCB-AST-GPS-0015': { purpose: 'Workload monitoring', location: 'Team hotel / venue', returnable: true, expectedReturn: '31-Mar-2027', lifecycle: 'In Use', ack: 'Confirmed' },
    'PCB-AST-TAB-0091': { purpose: 'Video analysis', location: 'Touring', returnable: true, expectedReturn: '31-Mar-2027', lifecycle: 'Issued', ack: 'Pending', ackHours: 20 },
    'PCB-AST-CUR-0005': { purpose: 'Pitch soil testing', location: 'Gaddafi Stadium', returnable: true, expectedReturn: '30-Jun-2027', lifecycle: 'In Use', ack: 'Confirmed' },
    'PCB-AST-LAS-0018': { purpose: 'Square levelling', location: 'Gaddafi Stadium', returnable: true, expectedReturn: '30-Jun-2027', lifecycle: 'Returned', ack: 'Confirmed' },
    'PCB-AST-SCN-0011': { purpose: 'Store barcode scanning', location: 'Central Store', returnable: true, expectedReturn: 'On exit', lifecycle: 'In Use', ack: 'Confirmed' },
    'PCB-AST-PRN-0004': { purpose: 'Asset tag printing', location: 'Central Store', returnable: true, expectedReturn: 'On exit', lifecycle: 'In Use', ack: 'Confirmed' }
  },
  ackEscalationHours: 48,

  /* ---------------- Reports (Module 11) ---------------- */
  spendByDept: [
    { name: 'Grounds & Infrastructure', value: 71400000 },
    { name: 'Cricket Operations', value: 41800000 },
    { name: 'Broadcast & Technology', value: 22750000 },
    { name: 'High Performance Centre', value: 16900000 },
    { name: 'PSL Operations', value: 12300000 },
    { name: 'Administration', value: 5600000 }
  ],
  spendByCategory: [
    { name: 'Floodlighting', value: 64800000 },
    { name: 'Match balls & gear', value: 38900000 },
    { name: 'Broadcast & tracking', value: 22750000 },
    { name: 'Turf machinery', value: 19600000 },
    { name: 'Apparel', value: 14200000 },
    { name: 'Medical & physio', value: 10500000 }
  ],
  tenderHistory: [
    { ref: 'PCB/LOG-PSL10/2026/089', title: 'LED floodlights, Gaddafi Stadium', method: 'Open competitive (two envelope)', value: 56876000, bidders: 4, stage: 'Approval', days: 30 },
    { ref: 'PCB/LOG-SPO/2026/041', title: 'Kookaburra balls framework', method: 'Open competitive (two envelope)', value: 17464000, bidders: 1, stage: 'Intention to award', days: 47 },
    { ref: 'PCB/INF-GRD/2026/052', title: 'Rain covers and pitch sheets', method: 'Open competitive (single envelope)', value: 5480000, bidders: 5, stage: 'Grievance', days: 38 },
    { ref: 'RFQ-2026-0102', title: 'John Deere hybrid mowers', method: 'RFQ', value: 11564000, bidders: 3, stage: 'PO issued', days: 12 },
    { ref: 'PCB/APP-KIT/2026/017', title: 'Domestic team kits', method: 'Open competitive (single envelope)', value: 9200000, bidders: 6, stage: 'Completed', days: 41 }
  ]
});

// The Kookaburra tender (041) is the one in its standstill window; keep the audit feed consistent.
PCB_DATA.recentActivities[0].desc = 'Intention to award published for Tender PCB/LOG-SPO/2026/041. 10-day grievance window active.';
PCB_DATA.recentActivities[0].details = 'Notice of Intention to Award posted on PCB & PPRA web portals. Standstill expires 16-Oct-2026 17:00 PST. No grievances filed so far.';
