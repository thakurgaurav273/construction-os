import { Prisma } from '@prisma/client';

export type InventoryStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCKED';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Convert a Prisma.Decimal (or nullable number) to a plain number for arithmetic and JSON output. */
export function num(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value);
}

/** Round to 2 decimals to keep monetary/quantity output clean. */
export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Stock free to issue or transfer. Damaged and lost stock is written out of `quantity` by its adjustment,
 * so it must not be subtracted again here; `damaged` only records how much was written off.
 */
export function availableStock(quantity: number, reserved: number): number {
  return Math.max(0, quantity - reserved);
}

/**
 * Stock status is derived at runtime (never persisted), mirroring the Materials module.
 * Damaged stock is already excluded from `available` by the caller.
 */
export function deriveInventoryStatus(available: number, reorderLevel: number): InventoryStatus {
  if (available <= 0) return 'OUT_OF_STOCK';
  if (available <= reorderLevel) return 'LOW_STOCK';
  if (reorderLevel > 0 && available > reorderLevel * 5) return 'OVERSTOCKED';
  return 'IN_STOCK';
}

export function paginate<T>(items: T[], page = 1, limit = 20): Paginated<T> {
  const total = items.length;
  const paged = items.slice((page - 1) * limit, page * limit);
  return { items: paged, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export function sortByKey<T extends Record<string, unknown>>(
  items: T[],
  sortKey: string,
  order: 'asc' | 'desc' | undefined,
): T[] {
  const dir = order === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
    return String(av ?? '').localeCompare(String(bv ?? '')) * dir;
  });
}

export function parseBool(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}
