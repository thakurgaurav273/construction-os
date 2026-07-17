import {
  formatCurrency,
  formatCompactINR,
  getStatusMeta,
  type StatusMeta,
} from '../../materials/components/materials-format';
import type {
  InventoryTransactionType,
  TransferStatus,
  AdjustmentReason,
} from '@/hooks/api/use-inventory';

// Status + currency formatting are identical to Materials - reuse the single source of truth.
export { formatCurrency, formatCompactINR, getStatusMeta };
export type { StatusMeta };

export type TxDirection = 'in' | 'out' | 'neutral';

export interface TxMeta {
  label: string;
  accentClass: string;
  iconBgClass: string;
  direction: TxDirection;
}

const TX_META: Record<InventoryTransactionType, TxMeta> = {
  RECEIVE: {
    label: 'Received',
    accentClass: 'text-emerald-600 dark:text-emerald-400',
    iconBgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    direction: 'in',
  },
  TRANSFER_IN: {
    label: 'Transfer In',
    accentClass: 'text-emerald-600 dark:text-emerald-400',
    iconBgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    direction: 'in',
  },
  RETURN: {
    label: 'Returned',
    accentClass: 'text-emerald-600 dark:text-emerald-400',
    iconBgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    direction: 'in',
  },
  ISSUE: {
    label: 'Issued',
    accentClass: 'text-red-600 dark:text-red-400',
    iconBgClass: 'bg-red-50 dark:bg-red-950/40',
    direction: 'out',
  },
  CONSUMPTION: {
    label: 'Consumed',
    accentClass: 'text-red-600 dark:text-red-400',
    iconBgClass: 'bg-red-50 dark:bg-red-950/40',
    direction: 'out',
  },
  TRANSFER_OUT: {
    label: 'Transfer Out',
    accentClass: 'text-blue-600 dark:text-blue-400',
    iconBgClass: 'bg-blue-50 dark:bg-blue-950/40',
    direction: 'out',
  },
  DAMAGE: {
    label: 'Damage / Loss',
    accentClass: 'text-red-600 dark:text-red-400',
    iconBgClass: 'bg-red-50 dark:bg-red-950/40',
    direction: 'out',
  },
  ADJUSTMENT: {
    label: 'Adjustment',
    accentClass: 'text-amber-600 dark:text-amber-400',
    iconBgClass: 'bg-amber-50 dark:bg-amber-950/40',
    direction: 'neutral',
  },
};

export function getTxMeta(type: InventoryTransactionType): TxMeta {
  return TX_META[type];
}

/** Resolve the +/− sign for a transaction. Adjustments follow the quantity's own sign. */
export function txSign(type: InventoryTransactionType, quantity: number): '+' | '−' {
  const meta = TX_META[type];
  if (meta.direction === 'in') return '+';
  if (meta.direction === 'out') return '−';
  return quantity < 0 ? '−' : '+';
}

export interface TransferStatusMeta {
  label: string;
  badgeClass: string;
}

const TRANSFER_STATUS_META: Record<TransferStatus, TransferStatusMeta> = {
  PENDING: {
    label: 'Pending',
    badgeClass:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400',
  },
  APPROVED: {
    label: 'Approved',
    badgeClass:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-400',
  },
  IN_TRANSIT: {
    label: 'In Transit',
    badgeClass:
      'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/40 dark:bg-indigo-950/40 dark:text-indigo-400',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400',
  },
  REJECTED: {
    label: 'Rejected',
    badgeClass:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClass: 'border-border bg-muted text-muted-foreground',
  },
};

export function getTransferStatusMeta(status: TransferStatus): TransferStatusMeta {
  return TRANSFER_STATUS_META[status];
}

export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
  CYCLE_COUNT: 'Cycle Count',
  DAMAGE: 'Damage',
  LOSS: 'Loss',
  FOUND: 'Found',
  CORRECTION: 'Correction',
  RETURN: 'Return',
};

/** Human label for a warehouse type enum value (SITE_STORE, CENTRAL, etc.). */
export function formatWarehouseType(type: string): string {
  return type
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
