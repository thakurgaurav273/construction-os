/**
 * Procurement demo data.
 *
 * Everything here is generated deterministically from a fixed seed and a fixed
 * reference date. Randomness or `new Date()` at module scope would produce
 * different values on the server and the client, which React would flag as a
 * hydration mismatch.
 *
 * Reference "today" is 2026-07-17, matching workforce-demo.ts.
 */

import { addDays, format } from 'date-fns';

export type ProcurementCategory =
  | 'Concrete'
  | 'Steel'
  | 'Electrical'
  | 'Mechanical'
  | 'HVAC'
  | 'Paint'
  | 'Tiles'
  | 'Equipment';

export type ApprovalStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'changes_requested';

export type DeliveryStatus =
  | 'not_started'
  | 'pending'
  | 'in_transit'
  | 'delivered'
  | 'delayed';

export type ProcurementPriority = 'low' | 'medium' | 'high' | 'critical';

export type RfqStatus = 'draft' | 'open' | 'closing_soon' | 'evaluating' | 'awarded';

export type VendorStatus = 'active' | 'inactive' | 'blacklisted';

export type ApprovalStage = 'Created' | 'Submitted' | 'Reviewed' | 'Approved' | 'Delivered';

export type InsightTone = 'critical' | 'warning' | 'positive' | 'info';

export interface Vendor {
  id: string;
  name: string;
  code: string;
  categories: ProcurementCategory[];
  status: VendorStatus;
  rating: number;
  performanceScore: number;
  onTimeDeliveryPercent: number;
  deliveryAccuracy: number;
  qualityRating: number;
  responseTimeHours: number;
  projectCount: number;
  totalOrders: number;
  outstandingBalance: number;
  lastOrderDate: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstNumber: string;
  paymentTerms: string;
  city: string;
  state: string;
  aiRecommendation: string;
}

export interface PoLineItem {
  id: string;
  description: string;
  category: ProcurementCategory;
  unit: string;
  quantity: number;
  rate: number;
  taxPercent: number;
  discountPercent: number;
}

export interface ApprovalStep {
  stage: ApprovalStage;
  actor: string;
  date: string | null;
  note: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  projectId: string;
  projectName: string;
  vendorId: string;
  vendorName: string;
  category: ProcurementCategory;
  createdBy: string;
  approver: string;
  requestedDate: string;
  expectedDelivery: string;
  amount: number;
  approvalStatus: ApprovalStatus;
  deliveryStatus: DeliveryStatus;
  priority: ProcurementPriority;
  deliveryAddress: string;
  items: PoLineItem[];
  timeline: ApprovalStep[];
  notes: string;
}

export interface Rfq {
  id: string;
  rfqNumber: string;
  projectId: string;
  projectName: string;
  title: string;
  category: ProcurementCategory;
  vendorsInvited: number;
  responsesReceived: number;
  issuedDate: string;
  closingDate: string;
  status: RfqStatus;
  priority: ProcurementPriority;
  estimatedValue: number;
  createdBy: string;
}

export interface Delivery {
  id: string;
  poNumber: string;
  vendorName: string;
  projectName: string;
  category: ProcurementCategory;
  status: DeliveryStatus;
  scheduledDate: string;
  actualDate: string | null;
  itemSummary: string;
  delayDays: number;
  trackingId: string;
}

export interface AiInsight {
  id: string;
  tone: InsightTone;
  title: string;
  body: string;
}

export interface ProjectRef {
  id: string;
  name: string;
}

const REFERENCE_DATE = new Date(2026, 6, 17);

function isoDay(offsetDays: number): string {
  return format(addDays(REFERENCE_DATE, offsetDays), 'yyyy-MM-dd');
}

/** mulberry32 - small deterministic PRNG so demo data is stable across renders. */
function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function range(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

export const PROCUREMENT_CATEGORIES: ProcurementCategory[] = [
  'Concrete', 'Steel', 'Electrical', 'Mechanical', 'HVAC', 'Paint', 'Tiles', 'Equipment',
];

export const procurementProjects: ProjectRef[] = [
  { id: 'p1', name: 'Marina Bay Residential Tower' },
  { id: 'p2', name: 'NH-48 Highway Extension' },
  { id: 'p3', name: 'Smart City Sector 9' },
  { id: 'p4', name: 'Riverside Commercial Complex' },
];

const SITE_ADDRESSES: Record<string, string> = {
  p1: 'Gate 2, Marina Bay Site Office, Worli Sea Face, Mumbai 400018',
  p2: 'NH-48 Package 3 Stores, Km 214, Vadodara 391240',
  p3: 'Central Stores, Sector 9 Smart City, Pune 411045',
  p4: 'Riverside Complex Yard B, Sabarmati Riverfront, Ahmedabad 380005',
};

const REQUESTERS = [
  'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sunita Reddy',
  'Vikram Singh', 'Anjali Mehta', 'Karthik Nair', 'Deepak Joshi',
];

const APPROVERS = ['Sanjay Gupta', 'Meera Krishnan', 'Arun Verma'];

const CONTACT_NAMES = [
  'Suresh Iyer', 'Nikhil Desai', 'Ravi Chandran', 'Pooja Bansal', 'Manoj Tiwari',
  'Kavita Rao', 'Harish Menon', 'Sneha Kulkarni', 'Imran Shaikh', 'Rohit Malhotra',
];

interface MaterialSeed {
  description: string;
  unit: string;
  rate: number;
}

const MATERIALS: Record<ProcurementCategory, MaterialSeed[]> = {
  Concrete: [
    { description: 'M30 Ready Mix Concrete', unit: 'cum', rate: 5800 },
    { description: 'M25 Ready Mix Concrete', unit: 'cum', rate: 5200 },
    { description: 'OPC 53 Grade Cement', unit: 'bag', rate: 420 },
    { description: 'PPC Cement', unit: 'bag', rate: 390 },
    { description: 'River Sand (Washed)', unit: 'cum', rate: 2400 },
    { description: '20mm Coarse Aggregate', unit: 'cum', rate: 1650 },
  ],
  Steel: [
    { description: 'TMT Bar Fe500D 12mm', unit: 'MT', rate: 62500 },
    { description: 'TMT Bar Fe500D 16mm', unit: 'MT', rate: 61800 },
    { description: 'TMT Bar Fe500D 25mm', unit: 'MT', rate: 61200 },
    { description: 'MS Structural Angle 50x50x6', unit: 'MT', rate: 58000 },
    { description: 'MS Plate 10mm', unit: 'MT', rate: 64000 },
    { description: 'Binding Wire 18 SWG', unit: 'kg', rate: 78 },
  ],
  Electrical: [
    { description: '1.5 sqmm FR Copper Wire', unit: 'coil', rate: 1850 },
    { description: '4 sqmm FR Copper Wire', unit: 'coil', rate: 4200 },
    { description: 'MCB Distribution Board 8-Way', unit: 'nos', rate: 3400 },
    { description: 'LED Panel Light 36W', unit: 'nos', rate: 720 },
    { description: 'PVC Conduit 25mm', unit: 'nos', rate: 145 },
    { description: 'Modular Switch 6A', unit: 'nos', rate: 165 },
  ],
  Mechanical: [
    { description: 'CI Centrifugal Pump 5 HP', unit: 'nos', rate: 42000 },
    { description: 'GI Pipe 50mm Class B', unit: 'nos', rate: 1250 },
    { description: 'Butterfly Valve 100mm', unit: 'nos', rate: 5600 },
    { description: 'SS 304 Fasteners Assorted', unit: 'kg', rate: 340 },
  ],
  HVAC: [
    { description: 'VRF Outdoor Unit 8HP', unit: 'nos', rate: 285000 },
    { description: 'GI Ducting Sheet 24G', unit: 'sqm', rate: 780 },
    { description: 'Nitrile Insulation 19mm', unit: 'sqm', rate: 320 },
    { description: 'Cassette AC Unit 2TR', unit: 'nos', rate: 48000 },
  ],
  Paint: [
    { description: 'Exterior Emulsion (Weatherproof)', unit: 'litre', rate: 340 },
    { description: 'Interior Emulsion Premium', unit: 'litre', rate: 260 },
    { description: 'Wall Primer', unit: 'litre', rate: 180 },
    { description: 'Synthetic Enamel Paint', unit: 'litre', rate: 290 },
  ],
  Tiles: [
    { description: 'Vitrified Tile 600x600mm', unit: 'sqm', rate: 720 },
    { description: 'Ceramic Wall Tile 300x600mm', unit: 'sqm', rate: 480 },
    { description: 'Anti-Skid Floor Tile', unit: 'sqm', rate: 560 },
    { description: 'Tile Adhesive (20kg)', unit: 'bag', rate: 480 },
  ],
  Equipment: [
    { description: 'Excavator Hire - CAT 320', unit: 'month', rate: 185000 },
    { description: 'Tower Crane Rental', unit: 'month', rate: 340000 },
    { description: 'Concrete Boom Pump Hire', unit: 'day', rate: 22000 },
    { description: 'Cuplock Scaffolding System', unit: 'sqm', rate: 145 },
  ],
};

/** Quantity bands keep generated order values realistic per unit type. */
const QUANTITY_BANDS: Record<string, [number, number]> = {
  cum: [40, 320],
  bag: [200, 2400],
  MT: [4, 45],
  kg: [80, 900],
  coil: [15, 120],
  nos: [10, 400],
  sqm: [120, 1800],
  litre: [150, 1200],
  month: [1, 4],
  day: [3, 18],
};

interface VendorSeed {
  name: string;
  categories: ProcurementCategory[];
  city: string;
  state: string;
  stateCode: string;
}

const VENDOR_SEEDS: VendorSeed[] = [
  { name: 'UltraTech Cement Distributors', categories: ['Concrete'], city: 'Mumbai', state: 'Maharashtra', stateCode: '27' },
  { name: 'Shree Concrete Solutions', categories: ['Concrete'], city: 'Pune', state: 'Maharashtra', stateCode: '27' },
  { name: 'ACC Ready Mix Partners', categories: ['Concrete'], city: 'Thane', state: 'Maharashtra', stateCode: '27' },
  { name: 'Prism Johnson RMC Depot', categories: ['Concrete'], city: 'Ahmedabad', state: 'Gujarat', stateCode: '24' },
  { name: 'Ambuja Cement Depot', categories: ['Concrete'], city: 'Vadodara', state: 'Gujarat', stateCode: '24' },
  { name: 'Tata Steel Processing Centre', categories: ['Steel'], city: 'Pune', state: 'Maharashtra', stateCode: '27' },
  { name: 'JSW Steel Traders', categories: ['Steel'], city: 'Mumbai', state: 'Maharashtra', stateCode: '27' },
  { name: 'Mahalaxmi Steels (SAIL Dealer)', categories: ['Steel'], city: 'Nagpur', state: 'Maharashtra', stateCode: '27' },
  { name: 'Jindal Panther TMT Supplies', categories: ['Steel'], city: 'Raipur', state: 'Chhattisgarh', stateCode: '22' },
  { name: 'Kamdhenu Structural Steel', categories: ['Steel', 'Mechanical'], city: 'Jaipur', state: 'Rajasthan', stateCode: '08' },
  { name: 'Havells Electrical Wholesale', categories: ['Electrical'], city: 'Delhi', state: 'Delhi', stateCode: '07' },
  { name: 'Polycab Cables & Wires', categories: ['Electrical'], city: 'Mumbai', state: 'Maharashtra', stateCode: '27' },
  { name: 'Finolex Electricals', categories: ['Electrical'], city: 'Pune', state: 'Maharashtra', stateCode: '27' },
  { name: 'Anchor Electricals Depot', categories: ['Electrical'], city: 'Surat', state: 'Gujarat', stateCode: '24' },
  { name: 'Schneider Electric Solutions', categories: ['Electrical'], city: 'Bengaluru', state: 'Karnataka', stateCode: '29' },
  { name: 'Kirloskar Pumps & Motors', categories: ['Mechanical'], city: 'Pune', state: 'Maharashtra', stateCode: '27' },
  { name: 'Grundfos Mechanical Systems', categories: ['Mechanical'], city: 'Chennai', state: 'Tamil Nadu', stateCode: '33' },
  { name: 'Hindalco Aluminium Systems', categories: ['Mechanical'], city: 'Mumbai', state: 'Maharashtra', stateCode: '27' },
  { name: 'Voltas HVAC Systems', categories: ['HVAC'], city: 'Mumbai', state: 'Maharashtra', stateCode: '27' },
  { name: 'Blue Star Climate Control', categories: ['HVAC'], city: 'Hyderabad', state: 'Telangana', stateCode: '36' },
  { name: 'Daikin Air Solutions India', categories: ['HVAC'], city: 'Neemrana', state: 'Rajasthan', stateCode: '08' },
  { name: 'Asian Paints Contractor Sales', categories: ['Paint'], city: 'Mumbai', state: 'Maharashtra', stateCode: '27' },
  { name: 'Berger Paints Bulk Supply', categories: ['Paint'], city: 'Kolkata', state: 'West Bengal', stateCode: '19' },
  { name: 'Nerolac Industrial Coatings', categories: ['Paint'], city: 'Pune', state: 'Maharashtra', stateCode: '27' },
  { name: 'Kajaria Ceramics Depot', categories: ['Tiles'], city: 'Delhi', state: 'Delhi', stateCode: '07' },
  { name: 'Somany Tiles Distributors', categories: ['Tiles'], city: 'Morbi', state: 'Gujarat', stateCode: '24' },
  { name: 'Nitco Marble & Tiles', categories: ['Tiles'], city: 'Mumbai', state: 'Maharashtra', stateCode: '27' },
  { name: 'JCB India Equipment Rentals', categories: ['Equipment'], city: 'Pune', state: 'Maharashtra', stateCode: '27' },
  { name: 'Escorts Kubota Machinery', categories: ['Equipment'], city: 'Faridabad', state: 'Haryana', stateCode: '06' },
  { name: 'Sanghvi Movers Crane Hire', categories: ['Equipment'], city: 'Pune', state: 'Maharashtra', stateCode: '27' },
];

const PAYMENT_TERMS = ['Net 30', 'Net 45', 'Net 60', '50% Advance, 50% on Delivery', 'Net 15'];

function vendorCode(name: string, index: number): string {
  const letters = name
    .replace(/[^A-Za-z ]/g, '')
    .split(/\s+/)
    .slice(0, 3)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
  return `VN-${letters}-${String(index + 1).padStart(3, '0')}`;
}

function gstNumber(stateCode: string, index: number): string {
  const pan = `AABC${String.fromCharCode(65 + (index % 26))}${1000 + index * 37}${String.fromCharCode(
    65 + ((index * 7) % 26),
  )}`;
  return `${stateCode}${pan}1Z${String.fromCharCode(65 + ((index * 3) % 26))}`;
}

function vendorEmail(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(/\s+/)
    .slice(0, 2)
    .join('');
  return `sales@${slug}.co.in`;
}

function buildVendorRecommendation(
  name: string,
  onTime: number,
  quality: number,
  category: ProcurementCategory,
): string {
  if (onTime >= 92 && quality >= 4.3) {
    return `Consistently strong performer. Preferred partner for ${category.toLowerCase()} - consider consolidating volume here to unlock better rate slabs.`;
  }
  if (onTime < 78) {
    return `On-time delivery has slipped to ${onTime}%. Add a backup supplier for ${category.toLowerCase()} before the next milestone and revisit penalty clauses with ${name}.`;
  }
  if (quality < 4.0) {
    return `Quality scores trail the category average. Increase inbound inspection sampling and log non-conformances against this vendor.`;
  }
  return `Reliable mid-tier vendor. Suitable for routine ${category.toLowerCase()} orders; negotiate longer payment terms at the next contract renewal.`;
}

function buildVendors(): Vendor[] {
  const rng = createRng(20260717);

  return VENDOR_SEEDS.map((seed, index) => {
    const onTimeDeliveryPercent = range(rng, 68, 99);
    const qualityRating = Math.round((3.4 + rng() * 1.6) * 10) / 10;
    const deliveryAccuracy = range(rng, 74, 99);
    const responseTimeHours = Math.round((1 + rng() * 22) * 10) / 10;
    const performanceScore = Math.round(
      onTimeDeliveryPercent * 0.45 + deliveryAccuracy * 0.3 + qualityRating * 20 * 0.25,
    );
    const rating = Math.round(Math.min(5, qualityRating * 0.6 + (onTimeDeliveryPercent / 100) * 2) * 10) / 10;
    const status: VendorStatus = onTimeDeliveryPercent < 72 ? 'inactive' : 'active';

    return {
      id: `v${String(index + 1).padStart(2, '0')}`,
      name: seed.name,
      code: vendorCode(seed.name, index),
      categories: seed.categories,
      status,
      rating,
      performanceScore,
      onTimeDeliveryPercent,
      deliveryAccuracy,
      qualityRating,
      responseTimeHours,
      projectCount: range(rng, 1, 4),
      totalOrders: range(rng, 6, 140),
      outstandingBalance: range(rng, 0, 84) * 25000,
      lastOrderDate: isoDay(-range(rng, 1, 96)),
      contactPerson: pick(rng, CONTACT_NAMES),
      phone: `+91 ${range(rng, 70, 99)}${range(rng, 100, 999)} ${range(rng, 10000, 99999)}`,
      email: vendorEmail(seed.name),
      gstNumber: gstNumber(seed.stateCode, index),
      paymentTerms: pick(rng, PAYMENT_TERMS),
      city: seed.city,
      state: seed.state,
      aiRecommendation: buildVendorRecommendation(
        seed.name,
        onTimeDeliveryPercent,
        qualityRating,
        seed.categories[0],
      ),
    };
  });
}

export const vendors: Vendor[] = buildVendors();

export function lineItemGross(item: PoLineItem): number {
  return item.quantity * item.rate;
}

export function lineItemTotal(item: PoLineItem): number {
  const gross = lineItemGross(item);
  const afterDiscount = gross - (gross * item.discountPercent) / 100;
  return Math.round(afterDiscount + (afterDiscount * item.taxPercent) / 100);
}

export function purchaseOrderSubtotal(items: PoLineItem[]): number {
  return items.reduce((sum, item) => sum + lineItemGross(item), 0);
}

export function purchaseOrderDiscount(items: PoLineItem[]): number {
  return items.reduce((sum, item) => sum + (lineItemGross(item) * item.discountPercent) / 100, 0);
}

export function purchaseOrderTax(items: PoLineItem[]): number {
  return items.reduce((sum, item) => {
    const gross = lineItemGross(item);
    const afterDiscount = gross - (gross * item.discountPercent) / 100;
    return sum + (afterDiscount * item.taxPercent) / 100;
  }, 0);
}

export function purchaseOrderTotal(items: PoLineItem[]): number {
  return items.reduce((sum, item) => sum + lineItemTotal(item), 0);
}

function buildTimeline(
  approvalStatus: ApprovalStatus,
  deliveryStatus: DeliveryStatus,
  createdBy: string,
  approver: string,
  requestedOffset: number,
): ApprovalStep[] {
  const created: ApprovalStep = {
    stage: 'Created',
    actor: createdBy,
    date: isoDay(requestedOffset),
    note: 'Purchase order drafted from approved indent.',
  };

  if (approvalStatus === 'draft') {
    return [
      created,
      { stage: 'Submitted', actor: createdBy, date: null, note: 'Awaiting submission for review.' },
      { stage: 'Reviewed', actor: 'Arun Verma', date: null, note: '' },
      { stage: 'Approved', actor: approver, date: null, note: '' },
      { stage: 'Delivered', actor: 'Site Stores', date: null, note: '' },
    ];
  }

  const submitted: ApprovalStep = {
    stage: 'Submitted',
    actor: createdBy,
    date: isoDay(requestedOffset + 1),
    note: 'Submitted to procurement for review.',
  };

  const reviewed: ApprovalStep = {
    stage: 'Reviewed',
    actor: 'Arun Verma',
    date: isoDay(requestedOffset + 2),
    note: 'Rates verified against the last three quotations.',
  };

  if (approvalStatus === 'pending') {
    return [
      created,
      submitted,
      reviewed,
      { stage: 'Approved', actor: approver, date: null, note: 'Awaiting approval.' },
      { stage: 'Delivered', actor: 'Site Stores', date: null, note: '' },
    ];
  }

  if (approvalStatus === 'rejected') {
    return [
      created,
      submitted,
      { ...reviewed, note: 'Rate variance above threshold - returned to requester.' },
      { stage: 'Approved', actor: approver, date: null, note: 'Rejected: quoted rate exceeds the budget ceiling.' },
      { stage: 'Delivered', actor: 'Site Stores', date: null, note: '' },
    ];
  }

  if (approvalStatus === 'changes_requested') {
    return [
      created,
      submitted,
      { ...reviewed, note: 'Changes requested - revise quantities and resubmit.' },
      { stage: 'Approved', actor: approver, date: null, note: '' },
      { stage: 'Delivered', actor: 'Site Stores', date: null, note: '' },
    ];
  }

  const approved: ApprovalStep = {
    stage: 'Approved',
    actor: approver,
    date: isoDay(requestedOffset + 3),
    note: 'Approved within delegated authority.',
  };

  const delivered: ApprovalStep = {
    stage: 'Delivered',
    actor: 'Site Stores',
    date: deliveryStatus === 'delivered' ? isoDay(requestedOffset + 10) : null,
    note:
      deliveryStatus === 'delivered'
        ? 'Material received and GRN raised.'
        : 'Awaiting delivery at site.',
  };

  return [created, submitted, reviewed, approved, delivered];
}

/** Weighted so the demo board reads like a real one: mostly approved, a healthy pending queue. */
const APPROVAL_WEIGHTS: ApprovalStatus[] = [
  'approved', 'approved', 'approved', 'approved', 'approved',
  'pending', 'pending', 'pending',
  'draft',
  'rejected',
  'changes_requested',
];

const PRIORITY_WEIGHTS: ProcurementPriority[] = [
  'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical',
];

function deliveryStatusFor(
  rng: () => number,
  approvalStatus: ApprovalStatus,
  expectedOffset: number,
): DeliveryStatus {
  if (approvalStatus !== 'approved') return 'not_started';
  if (expectedOffset < -3) return rng() < 0.85 ? 'delivered' : 'delayed';
  if (expectedOffset < 0) return rng() < 0.55 ? 'delivered' : 'delayed';
  if (expectedOffset <= 4) return rng() < 0.6 ? 'in_transit' : 'pending';
  return 'pending';
}

function buildPurchaseOrders(): PurchaseOrder[] {
  const rng = createRng(770717);
  const orders: PurchaseOrder[] = [];

  for (let i = 0; i < 75; i += 1) {
    const category = pick(rng, PROCUREMENT_CATEGORIES);
    const eligibleVendors = vendors.filter((v) => v.categories.includes(category));
    const vendor = pick(rng, eligibleVendors);
    const project = pick(rng, procurementProjects);
    const createdBy = pick(rng, REQUESTERS);
    const approver = pick(rng, APPROVERS);
    const approvalStatus = pick(rng, APPROVAL_WEIGHTS);
    const priority = pick(rng, PRIORITY_WEIGHTS);

    const requestedOffset = -range(rng, 2, 150);
    const expectedOffset = requestedOffset + range(rng, 10, 45);
    const deliveryStatus = deliveryStatusFor(rng, approvalStatus, expectedOffset);

    const catalogue = MATERIALS[category];
    const itemCount = Math.min(range(rng, 2, 5), catalogue.length);
    const chosenIndices = new Set<number>();
    while (chosenIndices.size < itemCount) {
      chosenIndices.add(Math.floor(rng() * catalogue.length));
    }

    const items: PoLineItem[] = Array.from(chosenIndices).map((catalogueIndex, itemIndex) => {
      const material = catalogue[catalogueIndex];
      const band = QUANTITY_BANDS[material.unit] ?? [10, 100];
      return {
        id: `poi-${i + 1}-${itemIndex + 1}`,
        description: material.description,
        category,
        unit: material.unit,
        quantity: range(rng, band[0], band[1]),
        rate: Math.round(material.rate * (0.94 + rng() * 0.14)),
        taxPercent: pick(rng, [5, 12, 18]),
        discountPercent: rng() < 0.45 ? range(rng, 1, 8) : 0,
      };
    });

    orders.push({
      id: `po-${String(i + 1).padStart(3, '0')}`,
      poNumber: `PO-2026-${String(1000 + i + 1)}`,
      projectId: project.id,
      projectName: project.name,
      vendorId: vendor.id,
      vendorName: vendor.name,
      category,
      createdBy,
      approver,
      requestedDate: isoDay(requestedOffset),
      expectedDelivery: isoDay(expectedOffset),
      amount: purchaseOrderTotal(items),
      approvalStatus,
      deliveryStatus,
      priority,
      deliveryAddress: SITE_ADDRESSES[project.id],
      items,
      timeline: buildTimeline(approvalStatus, deliveryStatus, createdBy, approver, requestedOffset),
      notes:
        priority === 'critical'
          ? 'Critical path material - expedite and confirm dispatch daily.'
          : 'Standard procurement against the approved BOQ line.',
    });
  }

  return orders;
}

export const purchaseOrders: PurchaseOrder[] = buildPurchaseOrders();

const RFQ_TITLES: Record<ProcurementCategory, string[]> = {
  Concrete: ['RMC supply for raft foundation', 'Cement supply - Q3 rate contract'],
  Steel: ['TMT reinforcement - Tower B', 'Structural steel fabrication package'],
  Electrical: ['Internal wiring package', 'DB and switchgear supply'],
  Mechanical: ['Pump room package', 'Plumbing and GI pipework'],
  HVAC: ['VRF system supply & install', 'Ducting and insulation works'],
  Paint: ['External facade painting', 'Internal emulsion package'],
  Tiles: ['Vitrified flooring supply', 'Bathroom tiling package'],
  Equipment: ['Tower crane hire - 12 months', 'Earthmoving fleet rental'],
};

function rfqStatusFor(closingOffset: number, responses: number, invited: number): RfqStatus {
  if (closingOffset < -5) return responses >= invited * 0.5 ? 'awarded' : 'evaluating';
  if (closingOffset < 0) return 'evaluating';
  if (closingOffset <= 4) return 'closing_soon';
  return 'open';
}

function buildRfqs(): Rfq[] {
  const rng = createRng(202020);
  const rfqList: Rfq[] = [];

  for (let i = 0; i < 20; i += 1) {
    const category = PROCUREMENT_CATEGORIES[i % PROCUREMENT_CATEGORIES.length];
    const project = pick(rng, procurementProjects);
    const vendorsInvited = range(rng, 3, 8);
    const closingOffset = range(rng, -18, 21);
    const responsesReceived =
      closingOffset > 6
        ? range(rng, 0, Math.max(1, vendorsInvited - 3))
        : range(rng, 1, vendorsInvited);
    const isDraft = closingOffset > 16 && rng() < 0.35;

    rfqList.push({
      id: `rfq-${String(i + 1).padStart(2, '0')}`,
      rfqNumber: `RFQ-2026-${String(200 + i + 1)}`,
      projectId: project.id,
      projectName: project.name,
      title: pick(rng, RFQ_TITLES[category]),
      category,
      vendorsInvited,
      responsesReceived: isDraft ? 0 : responsesReceived,
      issuedDate: isoDay(closingOffset - range(rng, 12, 30)),
      closingDate: isoDay(closingOffset),
      status: isDraft ? 'draft' : rfqStatusFor(closingOffset, responsesReceived, vendorsInvited),
      priority: pick(rng, PRIORITY_WEIGHTS),
      estimatedValue: range(rng, 6, 240) * 100000,
      createdBy: pick(rng, REQUESTERS),
    });
  }

  return rfqList;
}

export const rfqs: Rfq[] = buildRfqs();

function dayOffsetOf(isoDate: string): number {
  return Math.round((new Date(isoDate).getTime() - REFERENCE_DATE.getTime()) / 86400000);
}

function buildDeliveries(): Delivery[] {
  const rng = createRng(451451);

  return purchaseOrders
    .filter((po) => po.deliveryStatus !== 'not_started')
    .map((po, index) => ({
      id: `dlv-${String(index + 1).padStart(3, '0')}`,
      poNumber: po.poNumber,
      vendorName: po.vendorName,
      projectName: po.projectName,
      category: po.category,
      status: po.deliveryStatus,
      scheduledDate: po.expectedDelivery,
      actualDate:
        po.deliveryStatus === 'delivered'
          ? isoDay(dayOffsetOf(po.expectedDelivery) + range(rng, -3, 2))
          : null,
      itemSummary:
        po.items.length === 1
          ? po.items[0].description
          : `${po.items[0].description} +${po.items.length - 1} more`,
      delayDays: po.deliveryStatus === 'delayed' ? range(rng, 2, 14) : 0,
      trackingId: `TRK${String(90000 + index * 7)}`,
    }));
}

export const deliveries: Delivery[] = buildDeliveries();

export interface MonthlySpendPoint {
  month: string;
  spend: number;
  budget: number;
}

export const monthlySpendData: MonthlySpendPoint[] = [
  { month: 'Feb', spend: 18400000, budget: 20000000 },
  { month: 'Mar', spend: 22100000, budget: 21000000 },
  { month: 'Apr', spend: 19800000, budget: 22000000 },
  { month: 'May', spend: 26500000, budget: 24000000 },
  { month: 'Jun', spend: 24200000, budget: 25000000 },
  { month: 'Jul', spend: 27900000, budget: 26000000 },
];

export interface CategorySpendPoint {
  category: ProcurementCategory;
  spend: number;
}

export const spendByCategoryData: CategorySpendPoint[] = PROCUREMENT_CATEGORIES.map((category) => ({
  category,
  spend: purchaseOrders
    .filter((po) => po.category === category && po.approvalStatus === 'approved')
    .reduce((sum, po) => sum + po.amount, 0),
})).sort((a, b) => b.spend - a.spend);

export interface VendorSpendPoint {
  vendor: string;
  spend: number;
}

export const spendByVendorData: VendorSpendPoint[] = Object.entries(
  purchaseOrders
    .filter((po) => po.approvalStatus === 'approved')
    .reduce<Record<string, number>>((acc, po) => {
      acc[po.vendorName] = (acc[po.vendorName] ?? 0) + po.amount;
      return acc;
    }, {}),
)
  .map(([vendor, spend]) => ({ vendor, spend }))
  .sort((a, b) => b.spend - a.spend)
  .slice(0, 8);

export interface CycleTimePoint {
  month: string;
  rfqToPo: number;
  approvalDays: number;
  deliveryDays: number;
}

export const cycleTimeData: CycleTimePoint[] = [
  { month: 'Feb', rfqToPo: 12.4, approvalDays: 4.1, deliveryDays: 18.2 },
  { month: 'Mar', rfqToPo: 11.8, approvalDays: 3.8, deliveryDays: 17.4 },
  { month: 'Apr', rfqToPo: 10.9, approvalDays: 4.6, deliveryDays: 19.1 },
  { month: 'May', rfqToPo: 9.7, approvalDays: 3.2, deliveryDays: 16.8 },
  { month: 'Jun', rfqToPo: 9.1, approvalDays: 2.9, deliveryDays: 15.9 },
  { month: 'Jul', rfqToPo: 8.4, approvalDays: 2.6, deliveryDays: 15.2 },
];

export interface BottleneckPoint {
  stage: string;
  avgDays: number;
  pending: number;
}

export const approvalBottleneckData: BottleneckPoint[] = [
  { stage: 'Indent Review', avgDays: 1.2, pending: 6 },
  { stage: 'Procurement Check', avgDays: 2.4, pending: 9 },
  { stage: 'Finance Sign-off', avgDays: 4.8, pending: 14 },
  { stage: 'Director Approval', avgDays: 3.1, pending: 5 },
  { stage: 'Vendor Confirmation', avgDays: 1.8, pending: 4 },
];

export interface WeeklyDeliveryPoint {
  week: string;
  onTime: number;
  late: number;
}

export const weeklyDeliveryData: WeeklyDeliveryPoint[] = [
  { week: 'Wk 24', onTime: 18, late: 4 },
  { week: 'Wk 25', onTime: 22, late: 3 },
  { week: 'Wk 26', onTime: 19, late: 6 },
  { week: 'Wk 27', onTime: 25, late: 2 },
  { week: 'Wk 28', onTime: 21, late: 5 },
  { week: 'Wk 29', onTime: 27, late: 3 },
];

export interface SupplierPerformancePoint {
  vendor: string;
  onTime: number;
  quality: number;
}

export const supplierPerformanceData: SupplierPerformancePoint[] = [...vendors]
  .sort((a, b) => b.performanceScore - a.performanceScore)
  .slice(0, 6)
  .map((vendor) => ({
    vendor: vendor.name.split(' ').slice(0, 2).join(' '),
    onTime: vendor.onTimeDeliveryPercent,
    quality: Math.round(vendor.qualityRating * 20),
  }));

export const procurementAiInsights: AiInsight[] = [
  {
    id: 'ai-1',
    tone: 'warning',
    title: 'Steel prices up 7%',
    body: 'Fe500D TMT rates have risen 7% over the last 30 days. Marina Bay still has 180 MT to procure - locking a rate contract this week avoids roughly ₹7.8L of exposure.',
  },
  {
    id: 'ai-2',
    tone: 'critical',
    title: 'Concrete over budget by 4%',
    body: 'Concrete procurement for NH-48 Highway Extension is tracking 4% above the sanctioned budget. Review the M30 mix design and consolidate RMC orders to recover the variance.',
  },
  {
    id: 'ai-3',
    tone: 'critical',
    title: 'Repeated late deliveries',
    body: 'Ambuja Cement Depot has delivered late on three consecutive orders, averaging a 6 day slip. Escalate to the account manager and qualify a backup RMC supplier.',
  },
  {
    id: 'ai-4',
    tone: 'positive',
    title: 'Bulk cement saving available',
    body: 'Consolidating the four open cement indents into a single 2,400 bag order qualifies for the volume slab - an estimated 6% saving, roughly ₹2.1L.',
  },
  {
    id: 'ai-5',
    tone: 'info',
    title: 'Electrical order window closing',
    body: 'Smart City Sector 9 internal wiring starts in 21 days against a 16 day lead time. Raise the electrical PO within 5 days to protect the milestone.',
  },
  {
    id: 'ai-6',
    tone: 'warning',
    title: 'Finance sign-off is the bottleneck',
    body: 'Finance sign-off averages 4.8 days and holds 14 pending orders - the slowest stage in the cycle. Raising the delegated approval limit would clear most of the queue.',
  },
];
