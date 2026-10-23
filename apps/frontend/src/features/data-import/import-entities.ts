import { Boxes, FileText, Package, Store, type LucideIcon } from 'lucide-react';
import { downloadCsv } from '@/lib/download-csv';
import type { ImportEntity, RowOutcome } from '@/hooks/api/use-data-import';

interface EntityPresentation {
  icon: LucideIcon;
  summary: string;
  /** Where the imported records live. */
  href: string;
  destination: string;
}

export const ENTITY_PRESENTATION: Record<ImportEntity, EntityPresentation> = {
  MATERIAL: { icon: Package, summary: 'Item master: names, SKUs, units and rates', href: '/dashboard/materials', destination: 'Materials' },
  VENDOR: { icon: Store, summary: 'Suppliers with contacts, GSTIN and terms', href: '/dashboard/procurement', destination: 'Procurement' },
  OPENING_STOCK: { icon: Boxes, summary: 'Counted quantity of each material per store', href: '/dashboard/inventory', destination: 'Inventory' },
  PURCHASE_ORDER: { icon: FileText, summary: 'Orders with line items, created as drafts', href: '/dashboard/procurement', destination: 'Procurement' },
};

export const IMPORT_ENTITIES: readonly ImportEntity[] = ['MATERIAL', 'VENDOR', 'OPENING_STOCK', 'PURCHASE_ORDER'];

export function isImportEntity(value: string | null): value is ImportEntity {
  return value !== null && IMPORT_ENTITIES.some((entity) => entity === value);
}

/** The rows that need attention, as a CSV the admin can fix their sheet from. */
export function downloadIssues(rows: RowOutcome[], fileLabel: string): void {
  const issues = rows.filter((row) => row.action === 'error');
  downloadCsv(
    `${fileLabel.toLowerCase().replace(/\s+/g, '-')}-import-issues.csv`,
    ['Row', 'Record', 'Problem'],
    issues.map((row) => [row.rowNumber, row.label, row.messages.join(' ')]),
  );
}
