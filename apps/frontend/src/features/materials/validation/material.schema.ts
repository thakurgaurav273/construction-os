import { z } from 'zod';
import type { MaterialInput, MaterialListItem } from '@/hooks/api/use-materials';

const optionalAmount = z.union([z.literal(''), z.coerce.number().min(0, "Can't be negative")]);

export const materialSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter the material name').max(150),
    sku: z.string().trim().min(1, 'Enter a SKU').max(50),
    unit: z.string().trim().min(1, 'Enter the unit of measure').max(20),
    unitCost: optionalAmount,
    minStock: optionalAmount,
    maxStock: optionalAmount,
    categoryId: z.string(),
    supplierId: z.string(),
  })
  .refine(
    (values) => values.maxStock === '' || values.minStock === '' || values.maxStock >= values.minStock,
    { message: 'Maximum must be at least the minimum', path: ['maxStock'] },
  );

export type MaterialFormValues = z.infer<typeof materialSchema>;

export function toMaterialFormValues(material?: MaterialListItem): MaterialFormValues {
  return {
    name: material?.name ?? '',
    sku: material?.sku ?? '',
    unit: material?.unit ?? '',
    unitCost: material?.unitCost ?? '',
    minStock: material?.minStock ?? '',
    maxStock: material?.maxStock ?? '',
    categoryId: material?.categoryId ?? '',
    supplierId: material?.supplierId ?? '',
  };
}

export function toMaterialInput(values: MaterialFormValues): MaterialInput {
  return {
    name: values.name,
    sku: values.sku,
    unit: values.unit,
    unitCost: values.unitCost === '' ? 0 : values.unitCost,
    minStock: values.minStock === '' ? 0 : values.minStock,
    maxStock: values.maxStock === '' ? null : values.maxStock,
    categoryId: values.categoryId || null,
    supplierId: values.supplierId || null,
  };
}
