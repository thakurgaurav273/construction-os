import { formatCurrency } from '@/lib/utils';
import type { MaterialStatus, MovementType } from '@/hooks/api/use-materials';

export { formatCurrency };

/**
 * Compact Indian currency: ₹1.2Cr, ₹18.4L, ₹45k.
 *
 * Intl's `en-IN` groups digits (₹18,40,000) but omits the lakh/crore shorthand
 * dashboards lean on, so this covers the compact case for KPI tiles and charts.
 */
export function formatCompactINR(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)}Cr`;
  if (abs >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `₹${Math.round(amount / 1_000)}k`;
  return `₹${amount}`;
}

export interface StatusMeta {
  label: string;
  /** Badge classes (background + text + border) tuned for light and dark. */
  badgeClass: string;
  /** Text-only accent used for numbers and dots. */
  accentClass: string;
}

const STATUS_META: Record<MaterialStatus, StatusMeta> = {
  IN_STOCK: {
    label: 'In Stock',
    badgeClass:
      'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-400',
    accentClass: 'text-emerald-600 dark:text-emerald-400',
  },
  LOW_STOCK: {
    label: 'Low Stock',
    badgeClass:
      'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-400',
    accentClass: 'text-amber-600 dark:text-amber-400',
  },
  OUT_OF_STOCK: {
    label: 'Out of Stock',
    badgeClass:
      'border-red-200 bg-red-50 text-red-700 dark:border-red-800/40 dark:bg-red-950/40 dark:text-red-400',
    accentClass: 'text-red-600 dark:text-red-400',
  },
  OVERSTOCKED: {
    label: 'Overstocked',
    badgeClass:
      'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800/40 dark:bg-blue-950/40 dark:text-blue-400',
    accentClass: 'text-blue-600 dark:text-blue-400',
  },
};

export function getStatusMeta(status: MaterialStatus): StatusMeta {
  return STATUS_META[status];
}

export interface MovementMeta {
  label: string;
  /** Text/icon accent colour for the movement type. */
  accentClass: string;
  /** Soft background used behind the movement icon. */
  iconBgClass: string;
  /** True when the movement adds stock (renders a "+" and a down-arrow). */
  isInbound: boolean;
}

const MOVEMENT_META: Record<MovementType, MovementMeta> = {
  inbound: {
    label: 'Inbound',
    accentClass: 'text-emerald-600 dark:text-emerald-400',
    iconBgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
    isInbound: true,
  },
  outbound: {
    label: 'Outbound',
    accentClass: 'text-red-600 dark:text-red-400',
    iconBgClass: 'bg-red-50 dark:bg-red-950/40',
    isInbound: false,
  },
  consumption: {
    label: 'Consumption',
    accentClass: 'text-red-600 dark:text-red-400',
    iconBgClass: 'bg-red-50 dark:bg-red-950/40',
    isInbound: false,
  },
  transfer: {
    label: 'Transfer',
    accentClass: 'text-blue-600 dark:text-blue-400',
    iconBgClass: 'bg-blue-50 dark:bg-blue-950/40',
    isInbound: false,
  },
  adjustment: {
    label: 'Adjustment',
    accentClass: 'text-amber-600 dark:text-amber-400',
    iconBgClass: 'bg-amber-50 dark:bg-amber-950/40',
    isInbound: true,
  },
};

export function getMovementMeta(type: MovementType): MovementMeta {
  return MOVEMENT_META[type];
}
