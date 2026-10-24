import { z } from 'zod';
import { MAX_BOQ_ITEMS } from '../constants';
import type { ContractItem, ContractItemInput } from '../types';

export const boqItemSchema = z.object({
  id: z.string().optional(),
  itemNo: z.string().trim().min(1, 'Item no.').max(30),
  rateCode: z.string().trim().max(40),
  description: z.string().trim().min(2, 'Describe the item').max(2000),
  unit: z.string().trim().min(1, 'Unit').max(20),
  quantity: z.coerce.number({ invalid_type_error: 'Enter the BOQ quantity' }).min(0, "Can't be negative"),
  rate: z.coerce.number({ invalid_type_error: 'Enter the rate' }).min(0, "Can't be negative"),
  isExtra: z.boolean(),
});

export const boqSchema = z.object({
  items: z.array(boqItemSchema).max(MAX_BOQ_ITEMS),
}).superRefine(({ items }, context) => {
  const seen = new Map<string, number>();
  items.forEach((item, index) => {
    const key = item.itemNo.trim().toLowerCase();
    if (key && seen.has(key)) context.addIssue({ code: 'custom', path: ['items', index, 'itemNo'], message: 'Duplicate item no.' });
    seen.set(key, index);
  });
});

export type BoqFormValues = z.infer<typeof boqSchema>;
export type BoqItemFormValues = z.infer<typeof boqItemSchema>;

export function emptyBoqItem(nextNumber: number): BoqItemFormValues {
  return { itemNo: String(nextNumber), rateCode: '', description: '', unit: 'Sqm', quantity: 0, rate: 0, isExtra: false };
}

export function toBoqFormValues(items: ContractItem[]): BoqFormValues {
  return {
    items: items.map((item) => ({
      id: item.id,
      itemNo: item.itemNo,
      rateCode: item.rateCode ?? '',
      description: item.description,
      unit: item.unit,
      quantity: item.quantity,
      rate: item.rate,
      isExtra: item.isExtra,
    })),
  };
}

export function toContractItemInputs(values: BoqFormValues): ContractItemInput[] {
  return values.items.map((item) => ({ ...item, rateCode: item.rateCode || null }));
}
