/* Domain model. These shapes mirror the planned FastAPI response schemas. */

export type RoleKey = "director" | "committee" | "cfo" | "storekeeper" | "auditor";
export type TabKey = "overview" | "items" | "inventory" | "custody" | "sourcing" | "approvals" | "orders" | "finance" | "reports";

export interface Role {
  label: string;
  user: string;
  initials: string;
  tabs: "all" | string[];
  readOnly: boolean;
}

export interface Store {
  id: string;
  name: string;
  city: string;
  type: string;
  totalSkus: number;
  valuationPkr: number;
  custodian: string;
}

export interface Item {
  code: string;
  name: string;
  category: string;
  categoryCode: string;
  subCategory: string;
  classification: string;
  budgetType: "CapEx" | "OpEx";
  uom: string;
  totalStock: number;
  storeBreakdown: Record<string, number>;
  centralStock: number;
  reorderLevel: number;
  avgCostPkr: number;
  shelfLife: string;
  spec: string;
}

export type LedgerType = "OPEN" | "GRN" | "ISSUE" | "TRANSFER_OUT" | "TRANSFER_IN" | "RETURN" | "ADJUST";

export interface LedgerEntry {
  date: string;
  type: LedgerType;
  ref: string;
  doc: string;
  qty: number;
  unitCost?: number;
  party: string;
  custodian?: string;
  recipient?: string;
  purpose: string;
}

export interface ItemLedger {
  opening: { date: string; qty: number; unitCost: number };
  entries: LedgerEntry[];
}

export interface Bidder {
  id: string;
  rank: number;
  name: string;
  ntn: string;
  fbrStatus: string;
  techScore: number;
  techStatus: string;
  bidSecurity: string;
  quotedBasePkr: number;
  salesTaxPkr: number;
  evaluatedTotalPkr: number;
  evaluatedStatus: string;
  isWinner: boolean;
  envelopeEncrypted: boolean;
  dossier: { experienceYears: number; pastProjects: string; isoCertified: string; warrantyYears: string };
}

export interface Tender {
  id: string;
  tenderId: string;
  title: string;
  method: string;
  budgetType: string;
  estimatedBudgetPkr: number;
  currentStage: string;
  publishDate: string;
  techOpeningDate: string;
  finOpeningDate: string;
  bidSecurityPercent: string;
  sbdTemplate: string;
  committee: { name: string; role: string; coiDeclared: boolean }[];
  bidders: Bidder[];
}

export interface ApprovalStep {
  role: string;
  name: string;
  status: "approved" | "pending" | "waiting" | "returned" | "rejected";
  roleKey?: RoleKey;
  at?: string;
  remark?: string;
}

export interface Approval {
  id: string;
  type: string;
  ref: string;
  title: string;
  amount: number | null;
  band: string;
  dept: string;
  requestedBy: string;
  submitted: string;
  slaHours: number;
  elapsedHours: number;
  status: "pending" | "approved" | "rejected" | "returned";
  sodBlocked?: boolean;
  demandId?: string;
  chain: ApprovalStep[];
}

export interface Intention {
  tender: string;
  title: string;
  bidder: string;
  published: string;
  expires: string;
  days: number;
  elapsed: number;
}

export interface Grievance {
  id: string;
  tender: string;
  subject: string;
  complainant: string;
  filed: string;
  ground: string;
  committee: string;
  hearing: string;
  status: string;
}

export interface Demand {
  id: string;
  date: string;
  dept: string;
  by: string;
  itemCode: string;
  qty: number;
  issued: number;
  prQty: number;
  branch: "full" | "partial" | "none";
  sin?: string | null;
  pr?: string | null;
  requiredBy: string;
  purpose: string;
  budgetHead: string;
  status: string;
}

export interface Vendor {
  id: string;
  name: string;
  ntn: string;
  category: string;
  atl: boolean;
  prequal: number;
  rating: number;
  onTime: number;
  defects: number;
  status: "Eligible" | "Blacklisting proposed" | "Blacklisted";
  until?: string;
  nextDoc: string;
  nextExpiry: string;
  expiryDays: number;
  pos: number;
  value: number;
  pending: number;
}

export interface PurchaseOrder {
  po: string;
  date: string;
  vendor: string;
  vendorId: string;
  source: string;
  itemCode: string;
  item: string;
  qty: number;
  received: number;
  unitPrice: number;
  extras?: { desc: string; amount: number }[];
  taxRate: number;
  budgetHead: string;
  due: string;
  ld: string;
  terms: string;
  status: string;
}

export interface Grn {
  grn: string;
  po: string;
  date: string;
  qty: number;
  accepted: number;
  rejected: number;
  inspector: string;
  remark: string;
}

export interface Invoice {
  inv: string;
  po: string;
  grn: string;
  vendor: string;
  base: number;
  received: string;
  match: "Matched" | "Exception" | "Awaiting invoice";
  status: string;
  paidRef?: string;
  ageing: number;
  exception?: { poQty: number; grnQty: number; invQty: number; poRate: number; invRate: number; note: string };
}

export interface BudgetHead {
  id: string;
  name: string;
  type: "CapEx" | "OpEx";
  allocation: number;
  committed: number;
  spent: number;
}

export interface CustodyAsset {
  assetTag: string;
  itemCode: string;
  description: string;
  issuedDate: string;
  valuePkr: number;
  condition: string;
}

export interface CustodyHolder {
  empId: string;
  name: string;
  designation: string;
  department: string;
  assets: CustodyAsset[];
}

export type Lifecycle = "Issued" | "In Use" | "Returned" | "Under Repair" | "Disposed";

export interface CustodyMeta {
  purpose: string;
  location: string;
  returnable: boolean;
  expectedReturn: string;
  lifecycle: Lifecycle;
  ack: "Confirmed" | "Pending";
  ackHours?: number;
}

export interface Activity {
  id: string;
  title: string;
  desc: string;
  time: string;
  badge: string;
  details: string;
  user?: string;
}

export interface Guarantee {
  type: string;
  bidder: string;
  instrument: string;
  amount: number;
  validity: string;
  status: string;
}

export interface Quote {
  vendorId: string;
  base: number;
  delivery: string;
  validity: string;
  at?: string;
}
