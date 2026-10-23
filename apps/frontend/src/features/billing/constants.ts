import type { AdjustmentRule, ContractDirection, MeasurementType, RaBillStatus } from './types';

export const DIRECTION_LABELS: Record<ContractDirection, { label: string; short: string; party: string; description: string }> = {
  CLIENT: {
    label: 'Client contract',
    short: 'To client',
    party: 'Client',
    description: 'We do the work and bill the client. Money coming in.',
  },
  SUBCONTRACT: {
    label: 'Subcontract',
    short: 'From subcontractor',
    party: 'Subcontractor',
    description: 'A subcontractor works for us and bills us. Money going out.',
  },
};

export const BILL_STATUS_LABELS: Record<RaBillStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  CHANGES_REQUESTED: 'Sent back',
  CERTIFIED: 'Certified',
  CANCELLED: 'Cancelled',
};

export const MEASUREMENT_TYPES: { value: MeasurementType; label: string; hint: string }[] = [
  { value: 'DIMENSIONS', label: 'Nos × L × B × H', hint: 'Leave unused dimensions blank' },
  { value: 'STEEL', label: 'Steel (kg)', hint: 'Nos × cut length × kg per metre' },
  { value: 'DIRECT', label: 'Quantity', hint: 'Trips, lump sums, counted items' },
];

export const BOQ_UNITS = ['Sqm', 'Cum', 'Rmt', 'Kg', 'MT', 'Nos', 'Each', 'Trip', 'Day', 'LS'] as const;

/** Common Indian works-contract lines, offered as one-click starting points. */
export const ADJUSTMENT_PRESETS: AdjustmentRule[] = [
  { label: 'CGST 9%', effect: 'ADD', calculation: 'PERCENT', value: 9 },
  { label: 'SGST 9%', effect: 'ADD', calculation: 'PERCENT', value: 9 },
  { label: 'IGST 18%', effect: 'ADD', calculation: 'PERCENT', value: 18 },
  { label: 'TDS 1%', effect: 'DEDUCT', calculation: 'PERCENT', value: 1 },
  { label: 'BOCW cess 1%', effect: 'DEDUCT', calculation: 'PERCENT', value: 1 },
  { label: 'Security deposit 10%', effect: 'DEDUCT', calculation: 'PERCENT', value: 10 },
  { label: 'Retention 5%', effect: 'DEDUCT', calculation: 'PERCENT', value: 5 },
  { label: 'Safety hold 2%', effect: 'DEDUCT', calculation: 'PERCENT', value: 2 },
]

export const MAX_BOQ_ITEMS = 500;
export const MAX_ADJUSTMENTS = 20;
