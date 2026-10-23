import type { ProcurementPriority, PurchaseOrderStatus, RfqStatus } from './types';

export const PROCUREMENT_CATEGORIES = [
  'Concrete', 'Steel', 'Electrical', 'Mechanical', 'HVAC', 'Plumbing', 'Paint', 'Tiles', 'Equipment', 'Other',
];

export const PROCUREMENT_UNITS = ['nos', 'bag', 'cum', 'MT', 'kg', 'sqm', 'rmt', 'litre', 'coil', 'set', 'day', 'month'];

export const PRIORITY_OPTIONS: { value: ProcurementPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export const PRIORITY_RANK: Record<ProcurementPriority, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

export const PO_STATUS_OPTIONS: { value: PurchaseOrderStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CHANGES_REQUESTED', label: 'Changes Requested' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export const RFQ_STATUS_OPTIONS: { value: RfqStatus; label: string }[] = [
  { value: 'OPEN', label: 'Open' },
  { value: 'EVALUATING', label: 'Evaluating' },
  { value: 'AWARDED', label: 'Awarded' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/** Mirrors backend limits in procurement.constants.ts so the UI fails before the request does. */
export const MAX_LINE_ITEMS = 100;
export const MAX_RFQ_VENDORS = 25;
export const MAX_NOTE_LENGTH = 1000;
export const DEFAULT_GST_PERCENT = 18;
