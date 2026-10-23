import { z } from 'zod';
import { DEFAULT_GST_PERCENT, MAX_LINE_ITEMS } from '../constants';
import type { PurchaseOrder, PurchaseOrderInput, Vendor } from '../types';

const percent = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `Enter ${label}` })
    .min(0, "Can't be negative")
    .max(100, 'Max 100%');

/** Radix Select can't hold an empty value, so "not a stock item" uses a sentinel. */
export const NOT_STOCKED = 'none';

export const lineItemSchema = z.object({
  materialId: z.string(),
  description: z.string().trim().min(2, 'Describe the item').max(200),
  unit: z.string().trim().min(1, 'Unit').max(20),
  quantity: z.coerce.number({ invalid_type_error: 'Enter a quantity' }).positive('Must be more than 0'),
  rate: z.coerce.number({ invalid_type_error: 'Enter a rate' }).min(0, "Can't be negative"),
  taxPercent: percent('GST %'),
  discountPercent: percent('discount %'),
});

export const purchaseOrderSchema = z.object({
  projectId: z.string().min(1, 'Select a project'),
  vendorId: z.string().min(1, 'Select a vendor'),
  category: z.string().min(1, 'Select a category'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  expectedDelivery: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick the expected delivery date'),
  deliveryAddress: z.string().trim().max(300),
  notes: z.string().trim().max(2000),
  items: z.array(lineItemSchema).min(1, 'Add at least one line item').max(MAX_LINE_ITEMS),
});

export type PurchaseOrderFormValues = z.infer<typeof purchaseOrderSchema>;
export type LineItemFormValues = z.infer<typeof lineItemSchema>;

export function emptyLineItem(): LineItemFormValues {
  return { materialId: NOT_STOCKED, description: '', unit: 'nos', quantity: 1, rate: 0, taxPercent: DEFAULT_GST_PERCENT, discountPercent: 0 };
}

export function toPurchaseOrderFormValues(order?: PurchaseOrder, vendor?: Vendor, projectId?: string): PurchaseOrderFormValues {
  return {
    projectId: order?.project?.id ?? projectId ?? '',
    vendorId: order?.vendor?.id ?? vendor?.id ?? '',
    category: order?.category ?? vendor?.categories[0] ?? '',
    priority: order?.priority ?? 'MEDIUM',
    expectedDelivery: order?.expectedDelivery.slice(0, 10) ?? '',
    deliveryAddress: order?.deliveryAddress ?? '',
    notes: order?.notes ?? '',
    items: order?.items.map((item) => ({
      materialId: item.material?.id ?? NOT_STOCKED,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      rate: item.rate,
      taxPercent: item.taxPercent,
      discountPercent: item.discountPercent,
    })) ?? [emptyLineItem()],
  };
}

export function toPurchaseOrderInput(values: PurchaseOrderFormValues): PurchaseOrderInput {
  return {
    projectId: values.projectId,
    vendorId: values.vendorId,
    category: values.category,
    priority: values.priority,
    expectedDelivery: values.expectedDelivery,
    deliveryAddress: values.deliveryAddress,
    notes: values.notes,
    items: values.items.map(({ materialId, ...item }) => ({
      ...item,
      materialId: materialId === NOT_STOCKED ? undefined : materialId,
      category: values.category,
    })),
  };
}
