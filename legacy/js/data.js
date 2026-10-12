/* ==========================================================================
   PAKISTAN CRICKET BOARD (PCB) - COMPREHENSIVE ENTERPRISE DATASET
   Rich, interconnected domain data with zero dead-ends
   ========================================================================== */

const PCB_DATA = {
  meta: {
    systemName: "PCB Procurement & Inventory Management System",
    org: "Pakistan Cricket Board",
    version: "v2.5.0-Enterprise",
    ppraCompliance: "PPRA Rules 2004 (Rule 36b & Rule 38)",
    fiscalYear: "2026-2027",
    currency: "PKR"
  },

  stadiumStores: [
    {
      id: "STORE-LHR-01",
      name: "Gaddafi Stadium Central Store",
      city: "Lahore",
      type: "Central Hub",
      totalSkus: 18420,
      valuationPkr: 64200000,
      custodian: "Muhammad Rashid",
      capacityUsed: "82%",
      lastAudit: "04-Oct-2026",
      status: "Active"
    },
    {
      id: "STORE-KHI-01",
      name: "National Bank Stadium",
      city: "Karachi",
      type: "Regional Store",
      totalSkus: 9210,
      valuationPkr: 32100000,
      custodian: "Tariq Zaman",
      capacityUsed: "71%",
      lastAudit: "28-Sep-2026",
      status: "Active"
    },
    {
      id: "STORE-RWP-01",
      name: "Rawalpindi Cricket Stadium",
      city: "Rawalpindi",
      type: "Regional Store",
      totalSkus: 5430,
      valuationPkr: 18500000,
      custodian: "Khurram Shehzad",
      capacityUsed: "64%",
      lastAudit: "01-Oct-2026",
      status: "Active"
    },
    {
      id: "STORE-MUL-01",
      name: "Multan Cricket Stadium",
      city: "Multan",
      type: "Regional Store",
      totalSkus: 4110,
      valuationPkr: 14300000,
      custodian: "Naveed Akram",
      capacityUsed: "59%",
      lastAudit: "22-Sep-2026",
      status: "Active"
    },
    {
      id: "STORE-NCA-01",
      name: "National Cricket Academy (NCA)",
      city: "Lahore",
      type: "High-Performance Hub",
      totalSkus: 3890,
      valuationPkr: 13700000,
      custodian: "Dr. Asadullah",
      capacityUsed: "88%",
      lastAudit: "08-Oct-2026",
      status: "Active"
    }
  ],

  itemsMaster: [
    {
      code: "PCB-SPO-BALL-0042",
      name: "Kookaburra Turf Regulation White Match Balls (Box of 12)",
      category: "Sports & Match Gear",
      categoryCode: "SPO",
      subCategory: "Match Balls",
      classification: "Consumable",
      budgetType: "OpEx",
      uom: "Box (12 pcs)",
      totalStock: 140,
      storeBreakdown: {
        "STORE-LHR-01": 40,
        "STORE-KHI-01": 35,
        "STORE-RWP-01": 25,
        "STORE-MUL-01": 20,
        "STORE-NCA-01": 20
      },
      centralStock: 40,
      reorderLevel: 50,
      avgCostPkr: 185000,
      shelfLife: "24 Months",
      spec: "Australian Leather, 4-piece construction, ICC Regulation A Approved"
    },
    {
      code: "PCB-INF-LGT-0018",
      name: "Philips ArenaVision LED Floodlight Luminaire (1500W DMX-Controlled)",
      category: "Infrastructure & Stadium Works",
      categoryCode: "INF",
      subCategory: "Floodlighting",
      classification: "Non-Consumable (Asset)",
      budgetType: "CapEx",
      uom: "Unit",
      totalStock: 48,
      storeBreakdown: {
        "STORE-LHR-01": 20,
        "STORE-KHI-01": 12,
        "STORE-RWP-01": 8,
        "STORE-MUL-01": 8,
        "STORE-NCA-01": 0
      },
      centralStock: 20,
      reorderLevel: 10,
      avgCostPkr: 420000,
      shelfLife: "N/A (Asset)",
      spec: "5700K CCT, TLCI > 90, 4K/8K Ultra HD broadcast compliant, IP66 rated"
    },
    {
      code: "PCB-TRF-MOW-0007",
      name: "John Deere 8000 E-Cut Hybrid Fairway & Pitch Cylinder Mower",
      category: "Pitch & Ground Machinery",
      categoryCode: "TRF",
      subCategory: "Turf Care",
      classification: "Non-Consumable (Asset)",
      budgetType: "CapEx",
      uom: "Unit",
      totalStock: 6,
      storeBreakdown: {
        "STORE-LHR-01": 2,
        "STORE-KHI-01": 1,
        "STORE-RWP-01": 1,
        "STORE-MUL-01": 1,
        "STORE-NCA-01": 1
      },
      centralStock: 2,
      reorderLevel: 2,
      avgCostPkr: 4850000,
      shelfLife: "N/A (Asset)",
      spec: "Precision cylinder cutting, hybrid electric drive reels, adjustable 2mm-25mm"
    },
    {
      code: "PCB-APP-KIT-0091",
      name: "Team Pakistan Official Match Kit & Training Apparel (Set of 35 Units)",
      category: "Apparel & Merchandise",
      categoryCode: "APP",
      subCategory: "National Team",
      classification: "Consumable",
      budgetType: "OpEx",
      uom: "Squad Set",
      totalStock: 28,
      storeBreakdown: {
        "STORE-LHR-01": 8,
        "STORE-KHI-01": 6,
        "STORE-RWP-01": 4,
        "STORE-MUL-01": 2,
        "STORE-NCA-01": 8
      },
      centralStock: 8,
      reorderLevel: 15,
      avgCostPkr: 320000,
      shelfLife: "12 Months",
      spec: "Moisture-wicking recycled polyester, custom sublimation, PCB Gold Star crest"
    },
    {
      code: "PCB-MED-REC-0014",
      name: "Game Ready Cryo-Pneumatic Compression Therapy System",
      category: "Medical & High Performance",
      categoryCode: "MED",
      subCategory: "Physio Equipment",
      classification: "Non-Consumable (Asset)",
      budgetType: "CapEx",
      uom: "Unit",
      totalStock: 14,
      storeBreakdown: {
        "STORE-LHR-01": 4,
        "STORE-KHI-01": 2,
        "STORE-RWP-01": 2,
        "STORE-MUL-01": 2,
        "STORE-NCA-01": 4
      },
      centralStock: 4,
      reorderLevel: 4,
      avgCostPkr: 1450000,
      shelfLife: "N/A (Asset)",
      spec: "Dual-action RICE therapy, microprocessor controlled temperature & pressure"
    },
    {
      code: "PCB-BRD-HWK-0003",
      name: "Hawk-Eye Smart Pitch Calibration Sensor & Optical Tracker",
      category: "Broadcast & Tech Infrastructure",
      categoryCode: "BRD",
      subCategory: "Ball Tracking",
      classification: "Non-Consumable (Asset)",
      budgetType: "CapEx",
      uom: "Sensor Unit",
      totalStock: 12,
      storeBreakdown: {
        "STORE-LHR-01": 3,
        "STORE-KHI-01": 3,
        "STORE-RWP-01": 2,
        "STORE-MUL-01": 2,
        "STORE-NCA-01": 2
      },
      centralStock: 3,
      reorderLevel: 3,
      avgCostPkr: 3250000,
      shelfLife: "N/A (Asset)",
      spec: "Sub-millimeter ball-trajectory predictive analysis, ultra high-speed sync"
    }
  ],

  tenders: [
    {
      id: "TENDER-01",
      tenderId: "PCB/LOG-PSL10/2026/089",
      title: "Procurement & Turnkey Rigging of Broadcast-Grade LED Stadium Floodlights for Gaddafi Stadium",
      method: "Open Competitive Bidding (Two-Envelope PPRA Rule 36b)",
      budgetType: "CapEx",
      estimatedBudgetPkr: 60000000,
      currentStage: "Financial Opening & Comparative Statement",
      stageIndex: 4,
      publishDate: "12-Sep-2026",
      techOpeningDate: "02-Oct-2026",
      finOpeningDate: "12-Oct-2026",
      bidSecurityPercent: "2.0%",
      sbdTemplate: "PEC/PPRA Standard Bidding Document v4.2",
      committee: [
        { name: "Usman Zafar", role: "Chair / Director Procurement", coiDeclared: true },
        { name: "Tariq Mehmood", role: "Chief Financial Officer (CFO)", coiDeclared: true },
        { name: "Engr. Farhan Ali", role: "Chief Infrastructure Engineer", coiDeclared: true },
        { name: "Prof. Dr. Tahir Amin", role: "External Technical Specialist (NESPAK)", coiDeclared: true }
      ],
      bidders: [
        {
          id: "BID-01",
          rank: 1,
          name: "Signify Pakistan Ltd (Philips Lighting Solutions)",
          ntn: "1428901-4",
          fbrStatus: "Active Taxpayer",
          techScore: 92,
          techStatus: "Technically Qualified",
          bidSecurity: "HBL Bank Guarantee #HBL-BG-2026-9921 (PKR 1,200,000) - Verified",
          quotedBasePkr: 48200000,
          salesTaxPkr: 8676000,
          evaluatedTotalPkr: 56876000,
          whtDeductionPkr: 2169000,
          evaluatedStatus: "Lowest Evaluated Responsive Bidder",
          isWinner: true,
          envelopeEncrypted: false,
          dossier: {
            experienceYears: 24,
            pastProjects: "National Stadium Karachi Floodlights, Rawalpindi Mast Retrofit",
            isoCertified: "ISO 9001, ISO 14001, OHSAS 18001",
            warrantyYears: "5 Years Turnkey Warranty & Hypercare"
          }
        },
        {
          id: "BID-02",
          rank: 2,
          name: "Musco Stadium Lighting International",
          ntn: "0891230-2",
          fbrStatus: "Active Taxpayer",
          techScore: 88,
          techStatus: "Technically Qualified",
          bidSecurity: "MCB Bank Guarantee #MCB-BG-4412 (PKR 1,250,000) - Verified",
          quotedBasePkr: 52400000,
          salesTaxPkr: 9432000,
          evaluatedTotalPkr: 61832000,
          whtDeductionPkr: 2358000,
          evaluatedStatus: "Responsive (2nd Lowest)",
          isWinner: false,
          envelopeEncrypted: false,
          dossier: {
            experienceYears: 30,
            pastProjects: "Dubai International Stadium, Abu Dhabi Zayed Cricket Stadium",
            isoCertified: "ISO 9001",
            warrantyYears: "10 Years Musco Total Light Control Warranty"
          }
        },
        {
          id: "BID-03",
          rank: 3,
          name: "Osram Asia High-Power Solutions",
          ntn: "3310492-9",
          fbrStatus: "Active Taxpayer",
          techScore: 84,
          techStatus: "Technically Qualified",
          bidSecurity: "Meezan Bank CDR #MEZ-CDR-1192 (PKR 1,220,000) - Verified",
          quotedBasePkr: 54100000,
          salesTaxPkr: 9738000,
          evaluatedTotalPkr: 63838000,
          whtDeductionPkr: 2434500,
          evaluatedStatus: "Responsive (3rd Lowest)",
          isWinner: false,
          envelopeEncrypted: false,
          dossier: {
            experienceYears: 18,
            pastProjects: "Sharjah Cricket Stadium LED Upgrade",
            isoCertified: "ISO 9001",
            warrantyYears: "3 Years Standard Warranty"
          }
        },
        {
          id: "BID-04",
          rank: 4,
          name: "Apex Engineering Consortium",
          ntn: "2198031-1",
          fbrStatus: "Return Filing Pending",
          techScore: 58,
          techStatus: "Disqualified (Below 70 Min Threshold)",
          bidSecurity: "Bank of Punjab CDR #BOP-CDR-0912 - Valid",
          quotedBasePkr: 0,
          salesTaxPkr: 0,
          evaluatedTotalPkr: 0,
          whtDeductionPkr: 0,
          evaluatedStatus: "Financial Envelope Locked (Disqualified in Tech)",
          isWinner: false,
          envelopeEncrypted: true,
          dossier: {
            experienceYears: 6,
            pastProjects: "Local Sports Complex Luminaires",
            isoCertified: "None Provided",
            warrantyYears: "1 Year Limited"
          }
        }
      ]
    },
    {
      id: "TENDER-02",
      tenderId: "PCB/LOG-SPO/2026/041",
      title: "Framework Contract for Official ICC-Approved Kookaburra White Turf Balls for PSL 10 & Champions Trophy Camp",
      method: "Open Competitive Bidding (Single Stage Two-Envelope)",
      budgetType: "OpEx",
      estimatedBudgetPkr: 18500000,
      currentStage: "10-Day Standstill & Intention to Award",
      stageIndex: 5,
      publishDate: "20-Aug-2026",
      techOpeningDate: "10-Sep-2026",
      finOpeningDate: "24-Sep-2026",
      bidSecurityPercent: "2.5%",
      sbdTemplate: "PCB Goods Procurement Standard Document v3.1",
      committee: [
        { name: "Usman Zafar", role: "Chair / Director Procurement", coiDeclared: true },
        { name: "Bilal Hasan", role: "Equipment Manager", coiDeclared: true },
        { name: "Tariq Mehmood", role: "Chief Financial Officer (CFO)", coiDeclared: true }
      ],
      bidders: [
        {
          id: "BID-T2-01",
          rank: 1,
          name: "CA Sports Sialkot (Authorized Kookaburra Agent)",
          ntn: "0492104-9",
          fbrStatus: "Active Taxpayer",
          techScore: 96,
          techStatus: "Technically Qualified",
          bidSecurity: "Allied Bank CDR #ABL-9921 (PKR 462,500) - Verified",
          quotedBasePkr: 14800000,
          salesTaxPkr: 2664000,
          evaluatedTotalPkr: 17464000,
          whtDeductionPkr: 666000,
          evaluatedStatus: "Lowest Evaluated Responsive Bidder",
          isWinner: true,
          envelopeEncrypted: false,
          dossier: {
            experienceYears: 42,
            pastProjects: "PCB Official Ball Supplier 2021-2025",
            isoCertified: "ISO 9001",
            warrantyYears: "Batch Quality Guarantee"
          }
        }
      ]
    }
  ],

  custodyHolders: [
    {
      empId: "PCB-PLR-0056",
      name: "Babar Azam",
      designation: "National Team Senior Batter",
      department: "Men's National Cricket Team",
      stadiumBase: "Gaddafi Stadium / NCA",
      activeAssetsCount: 4,
      clearanceStatus: "Active Custodian (All Assets Verified)",
      assets: [
        {
          assetTag: "PCB-AST-SEN-0042",
          itemCode: "PCB-SPO-SEN-0001",
          description: "StanceBeam Bat Motion Sensor Kit (Bluetooth 5.0)",
          issuedDate: "14-Jul-2026",
          valuePkr: 95000,
          condition: "Excellent"
        },
        {
          assetTag: "PCB-AST-GPS-0012",
          itemCode: "PCB-MED-GPS-0004",
          description: "Catapult Vector S7 Athlete Tracking Vest & GPS Pod",
          issuedDate: "14-Jul-2026",
          valuePkr: 420000,
          condition: "Good"
        },
        {
          assetTag: "PCB-AST-TAB-0089",
          itemCode: "PCB-IT-TAB-0021",
          description: "iPad Pro 12.9 M2 Video Analysis Tactical Tablet",
          issuedDate: "20-Aug-2026",
          valuePkr: 380000,
          condition: "Excellent"
        },
        {
          assetTag: "PCB-AST-BAG-0112",
          itemCode: "PCB-APP-BAG-0003",
          description: "Official Team Pakistan Personalized Heavy-Duty Wheelie Bag",
          issuedDate: "10-Sep-2026",
          valuePkr: 65000,
          condition: "Good"
        }
      ]
    },
    {
      empId: "PCB-PLR-0010",
      name: "Shaheen Shah Afridi",
      designation: "Lead Fast Bowler",
      department: "Men's National Cricket Team",
      stadiumBase: "Gaddafi Stadium / NCA",
      activeAssetsCount: 3,
      clearanceStatus: "Active Custodian",
      assets: [
        {
          assetTag: "PCB-AST-SLV-0008",
          itemCode: "PCB-MED-BIO-0002",
          description: "Smart High-Speed Bowling Arm Biomechanical Sensor Sleeve",
          issuedDate: "05-Aug-2026",
          valuePkr: 310000,
          condition: "Excellent"
        },
        {
          assetTag: "PCB-AST-GPS-0015",
          itemCode: "PCB-MED-GPS-0004",
          description: "Catapult Vector S7 Fast-Bowler Pod & Heart-Rate Harness",
          issuedDate: "05-Aug-2026",
          valuePkr: 420000,
          condition: "Excellent"
        },
        {
          assetTag: "PCB-AST-TAB-0091",
          itemCode: "PCB-IT-TAB-0021",
          description: "iPad Pro 12.9 M2 Video Analysis Tactical Tablet",
          issuedDate: "20-Aug-2026",
          valuePkr: 380000,
          condition: "Good"
        }
      ]
    },
    {
      empId: "PCB-CUR-0014",
      name: "Hafiz Shabbir",
      designation: "Chief Pitch Curator",
      department: "Grounds & Pitches Infrastructure",
      stadiumBase: "Gaddafi Stadium Lahore",
      activeAssetsCount: 2,
      clearanceStatus: "Active Custodian",
      assets: [
        {
          assetTag: "PCB-AST-CUR-0005",
          itemCode: "PCB-TRF-PEN-0002",
          description: "Turf-Tech Digital Soil Compaction & Moisture Penetrometer",
          issuedDate: "02-May-2026",
          valuePkr: 290000,
          condition: "Calibrated"
        },
        {
          assetTag: "PCB-AST-LAS-0018",
          itemCode: "PCB-TRF-LAS-0001",
          description: "Leica Rugby 610 Pitch Elevation Laser Level System",
          issuedDate: "18-Jun-2026",
          valuePkr: 580000,
          condition: "Excellent"
        }
      ]
    },
    {
      empId: "PCB-STF-0089",
      name: "Bilal Hasan",
      designation: "Equipment Manager",
      department: "Logistics & Store Custody Wing",
      stadiumBase: "Gaddafi Stadium Lahore",
      activeAssetsCount: 2,
      clearanceStatus: "Active Departmental Custodian",
      assets: [
        {
          assetTag: "PCB-AST-SCN-0011",
          itemCode: "PCB-IT-SCN-0003",
          description: "Zebra TC52x Rugged Handheld Barcode/QR Inventory Computer",
          issuedDate: "12-Jan-2026",
          valuePkr: 240000,
          condition: "Good"
        },
        {
          assetTag: "PCB-AST-PRN-0004",
          itemCode: "PCB-IT-PRN-0002",
          description: "Zebra ZD621 Industrial Barcode Asset Tag Printer",
          issuedDate: "12-Jan-2026",
          valuePkr: 195000,
          condition: "Good"
        }
      ]
    }
  ],

  reconciliationRecord: {
    matchId: "3WM-2026-0814",
    status: "VERIFIED_THREE_WAY_MATCH",
    po: {
      number: "PO-PCB-2026-0312",
      date: "14-Sep-2026",
      vendor: "Signify Pakistan Ltd (Philips)",
      item: "Philips ArenaVision LED Floodlight Luminaire (Batch of 20)",
      qty: 20,
      unitPrice: 420000,
      baseTotal: 8400000,
      terms: "Liquidated damages 0.1% per day up to 10%. Net 30 days.",
      budgetHead: "Stadium Infrastructure CapEx (PC-1)",
      status: "Approved"
    },
    grn: {
      number: "GRN-LHR-2026-0491",
      date: "04-Oct-2026",
      deliveryLocation: "Gaddafi Stadium Central Store",
      qtyDelivered: 20,
      qtyAccepted: 20,
      qtyRejected: 0,
      inspector: "Engr. Farhan Ali (Chief Infrastructure Engineer)",
      inspectionResult: "100% Passed. Lux output and photometric calibration certified.",
      tagRange: "PCB-AST-LGT-001 to PCB-AST-LGT-020",
      status: "Accepted"
    },
    invoice: {
      number: "INV-SIG-2026-9812",
      date: "06-Oct-2026",
      strn: "14-28-9014-001-92",
      ntn: "1428901-4",
      billedBase: 8400000,
      salesTax18: 1512000,
      grossTotal: 9912000,
      varianceBasePkr: 0,
      variancePct: 0.0,
      status: "Reconciled"
    },
    taxes: {
      base: 8400000,
      salesTax18: 1512000,
      gross: 9912000,
      wht4_5: 378000,
      netPayable: 9534000
    },
    paymentDisbursed: false
  },

  recentActivities: [
    {
      id: "ACT-01",
      type: "tender",
      title: "PPRA Standstill Period Triggered",
      desc: "Intention to award published for Tender PCB/LOG-PSL10/2026/089. 10-day grievance window active.",
      time: "14 mins ago",
      badge: "PPRA Compliance",
      color: "gold",
      details: "Notice of Intention to Award posted on PCB & PPRA web portals per Rule 35. Standstill expiration date: 22-Oct-2026 17:00 PST. No grievances filed."
    },
    {
      id: "ACT-02",
      type: "inventory",
      title: "Smart Requisition Stock Reservation",
      desc: "Requisition REQ-2026-1044 split: 40 boxes reserved at Gaddafi Central Store, 60 boxes routed to Procurement.",
      time: "42 mins ago",
      badge: "Auto Branching",
      color: "green",
      details: "High Performance Division indent processed. Branch 1: SIN-LHR-8902 generated for 40 units. Branch 2: PR-AUTO-4401 generated for 60 units balance."
    },
    {
      id: "ACT-03",
      type: "custody",
      title: "Digital Chain-of-Custody Sign-off",
      desc: "Babar Azam acknowledged custody transfer for StanceBeam Motion Sensor (PCB-AST-SEN-0042) via secure OTP.",
      time: "2 hours ago",
      badge: "Custody Chain",
      color: "blue",
      details: "Electronic transfer signed with OTP #849201 from verified player mobile device. Chain recorded: Central Store -> Bilal Hasan -> Babar Azam."
    },
    {
      id: "ACT-04",
      type: "finance",
      title: "Three-Way Match Reconciled",
      desc: "PO-PCB-2026-0312 vs GRN-LHR-2026-0491 vs INV-SIG-2026-9812 matched with 0.00% variance.",
      time: "4 hours ago",
      badge: "Finance Gate",
      color: "green",
      details: "Full tolerance validation successful. Gross: PKR 9,912,000. WHT 4.5%: PKR 378,000. Net Payable: PKR 9,534,000 queued for RTGS disbursement."
    }
  ]
};

// Aliases and global attachment
PCB_DATA.activeTenders = PCB_DATA.tenders;
if (typeof window !== 'undefined') {
  window.PCB_DATA = PCB_DATA;
}
if (typeof global !== 'undefined') {
  global.PCB_DATA = PCB_DATA;
}
