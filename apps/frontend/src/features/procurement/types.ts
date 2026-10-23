/** Mirrors the procurement views returned by the backend (apps/backend/src/modules/procurement/*.mapper.ts). */

export type PurchaseOrderStatus = 'DRAFT' | 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type ProcurementPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PoDeliveryStatus = 'NOT_STARTED' | 'SCHEDULED' | 'IN_TRANSIT' | 'PARTIAL' | 'DELIVERED';
export type DeliveryStatus = 'SCHEDULED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
export type RfqStatus = 'OPEN' | 'EVALUATING' | 'AWARDED' | 'CANCELLED';
export type RfqInvitationStatus = 'INVITED' | 'QUOTED' | 'DECLINED';
export type VendorStatus = 'ACTIVE' | 'INACTIVE';

export interface NamedRef {
  id: string;
  name: string;
}

export interface PoLineItem {
  id: string;
  /** Catalogue material whose stock this line replenishes; null for services and unlinked lines. */
  material: { id: string; name: string; unit: string } | null;
  description: string;
  category: string;
  unit: string;
  quantity: number;
  rate: number;
  taxPercent: number;
  discountPercent: number;
  total: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  category: string;
  status: PurchaseOrderStatus;
  priority: ProcurementPriority;
  project: NamedRef | null;
  vendor: NamedRef | null;
  requestedBy: NamedRef | null;
  requestedDate: string;
  expectedDelivery: string;
  submittedAt: string | null;
  amount: number;
  deliveryAddress: string;
  notes: string;
  deliveryStatus: PoDeliveryStatus;
  receivedPercent: number;
  isOverdue: boolean;
  items: PoLineItem[];
}

export interface PoTimelineEvent {
  id: string;
  stage: string;
  actor: string;
  date: string;
  note: string;
}

export interface ReceivedItem {
  poLineItemId: string;
  description: string;
  unit: string;
  quantity: number;
}

export interface Delivery {
  id: string;
  grnNumber: string | null;
  status: DeliveryStatus;
  scheduledDate: string;
  receivedAt: string | null;
  trackingId: string | null;
  notes: string | null;
  delayDays: number;
  isDelayed: boolean;
  purchaseOrder: { id: string; poNumber: string; category: string };
  vendor: NamedRef | null;
  project: NamedRef | null;
  receivedBy: NamedRef | null;
  /** Store the goods were posted into; null when nothing received was a stocked material. */
  warehouse: NamedRef | null;
  items: ReceivedItem[];
}

export interface PurchaseOrderDetail extends PurchaseOrder {
  reviewedBy: NamedRef | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  sourceRfq: { id: string; rfqNumber: string } | null;
  timeline: PoTimelineEvent[];
  deliveries: Delivery[];
}

export interface VendorStats {
  totalOrders: number;
  projectCount: number;
  totalSpend: number;
  lastOrderDate: string | null;
  onTimeDeliveryPercent: number | null;
  deliveriesReceived: number;
  /** Approved vendor bills not yet paid (from finance). */
  outstandingBalance: number;
}

export interface Vendor {
  id: string;
  name: string;
  code: string;
  categories: string[];
  status: VendorStatus;
  rating: number;
  performanceScore: number;
  deliveryAccuracy: number;
  qualityRating: number;
  responseTimeHours: number;
  outstandingBalance: number;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  paymentTerms: string | null;
  city: string | null;
  state: string | null;
  aiRecommendation: string | null;
  createdAt: string;
  stats: VendorStats;
}

export interface Rfq {
  id: string;
  rfqNumber: string;
  title: string;
  description: string | null;
  category: string;
  status: RfqStatus;
  priority: ProcurementPriority;
  issuedDate: string;
  closingDate: string;
  estimatedValue: number;
  isClosingSoon: boolean;
  isPastClosing: boolean;
  project: NamedRef | null;
  createdBy: NamedRef | null;
  awardedVendor: NamedRef | null;
  awardedAt: string | null;
  purchaseOrder: { id: string; poNumber: string } | null;
  vendorsInvited: number;
  quotesReceived: number;
  lowestQuote: number | null;
}

export interface RfqItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
}

export interface QuoteRate {
  rfqItemId: string;
  rate: number;
  amount: number;
}

export interface RfqInvitation {
  id: string;
  vendor: { id: string; name: string; code: string; status: VendorStatus };
  status: RfqInvitationStatus;
  invitedAt: string;
  respondedAt: string | null;
  leadTimeDays: number | null;
  validUntil: string | null;
  taxPercent: number;
  notes: string | null;
  subtotal: number | null;
  quotedAmount: number | null;
  rates: QuoteRate[];
  isLowest: boolean;
  isAwarded: boolean;
}

export interface RfqDetail extends Rfq {
  items: RfqItem[];
  invitations: RfqInvitation[];
}

export interface ProcurementSummary {
  openRfqs: number;
  rfqsClosingSoon: number;
  pendingApprovals: number;
  pendingValue: number;
  oldestPendingDays: number | null;
  approvedThisQuarter: number;
  approvedLastQuarter: number;
  committedThisMonth: number;
  committedLastMonth: number;
  activeVendors: number;
  overdueOrders: number;
  deliveriesDueThisWeek: number;
  attention: {
    overdueOrders: { id: string; poNumber: string; vendorName: string | null; daysLate: number }[];
    stalePendingOrders: { id: string; poNumber: string; daysWaiting: number; amount: number }[];
    closingRfqs: {
      id: string; rfqNumber: string; title: string; daysLeft: number; quotesReceived: number; vendorsInvited: number;
    }[];
  };
}

export interface ProcurementAnalytics {
  totals: {
    committed: number;
    received: number;
    avgApprovalDays: number | null;
    avgDeliveryDays: number | null;
    avgRfqToAwardDays: number | null;
  };
  monthly: { month: string; label: string; committed: number; received: number }[];
  byCategory: { name: string; value: number }[];
  byVendor: { name: string; value: number }[];
  cycleTimes: {
    month: string;
    label: string;
    approvalDays: number | null;
    deliveryDays: number | null;
    rfqToAwardDays: number | null;
  }[];
  approvalQueue: { label: string; count: number; value: number }[];
  weeklyDeliveries: { weekStart: string; label: string; onTime: number; late: number }[];
  supplierPerformance: { vendor: string; onTimePercent: number; deliveries: number }[];
}

/* ---------- Request payloads (match the backend DTOs) ---------- */

export interface PurchaseOrderItemInput {
  materialId?: string;
  description: string;
  category?: string;
  unit: string;
  quantity: number;
  rate: number;
  taxPercent: number;
  discountPercent: number;
}

export interface PurchaseOrderInput {
  projectId: string;
  vendorId: string;
  category: string;
  priority: ProcurementPriority;
  expectedDelivery: string;
  deliveryAddress?: string;
  notes?: string;
  items: PurchaseOrderItemInput[];
}

export interface VendorInput {
  name: string;
  code?: string;
  categories: string[];
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  gstNumber: string | null;
  paymentTerms: string | null;
  city: string | null;
  state: string | null;
}

export interface RfqInput {
  title: string;
  description?: string;
  projectId: string;
  category: string;
  priority: ProcurementPriority;
  closingDate: string;
  estimatedValue?: number;
  vendorIds: string[];
  items: { description: string; unit: string; quantity: number }[];
}

export interface QuoteInput {
  leadTimeDays: number;
  validUntil?: string;
  taxPercent: number;
  notes?: string;
  items: { rfqItemId: string; rate: number }[];
}

export interface ScheduleDeliveryInput {
  scheduledDate: string;
  trackingId?: string;
  notes?: string;
}

export interface ReceiveGoodsInput {
  deliveryId?: string;
  warehouseId?: string;
  receivedAt?: string;
  trackingId?: string;
  notes?: string;
  items: { poLineItemId: string; quantity: number; materialId?: string }[];
}

export interface ReorderSuggestion {
  material: { id: string; name: string; sku: string; unit: string; unitCost: number };
  warehouse: { id: string; name: string; projectId: string | null } | null;
  available: number;
  reorderLevel: number;
  targetLevel: number;
  onOrder: number;
  inApproval: number;
  suggestedQuantity: number;
  lastPurchase: {
    poNumber: string;
    date: string;
    vendor: NamedRef | null;
    rate: number;
    taxPercent: number;
    category: string;
  } | null;
  projectId: string | null;
  deliveryAddress: string;
  category: string;
}
