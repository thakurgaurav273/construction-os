import type { ContractDirection, RaBillStatus } from '@prisma/client';

export const MAX_CONTRACT_ITEMS = 500;
export const MAX_ADJUSTMENT_RULES = 20;
export const MAX_MEASUREMENTS_PER_ITEM = 300;
export const MAX_NOTE_LENGTH = 1000;

/** A bill is open while it can still change; a contract has at most one open bill at a time. */
export const OPEN_BILL_STATUSES: RaBillStatus[] = ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED'];
export const EDITABLE_BILL_STATUSES: RaBillStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];

export const BILL_EVENTS = {
  created: 'Created',
  submitted: 'Submitted',
  changesRequested: 'Sent back for changes',
  certified: 'Certified',
  cancelled: 'Cancelled',
  openingBalance: 'Opening balance imported',
  measurementsImported: 'Measurements imported',
} as const;

export const DIRECTION_PARTY: Record<ContractDirection, string> = { CLIENT: 'Client', SUBCONTRACT: 'Subcontractor' };
