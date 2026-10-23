import { z } from 'zod';
import type { SiteStockMovementInput } from '@/hooks/api/use-materials';

export const siteStockSchema = z.object({
  projectId: z.string().min(1, 'Choose a project'),
  materialId: z.string().min(1, 'Choose a material'),
  warehouseId: z.string().min(1, 'Choose a store'),
  quantity: z.coerce
    .number({ invalid_type_error: 'Enter a quantity' })
    .positive('Enter a quantity above zero')
    .max(1_000_000_000),
  issuedOn: z.string().min(1, 'Choose a date'),
  note: z.string().trim().max(500),
});

export type SiteStockFormValues = z.infer<typeof siteStockSchema>;

export function toSiteStockInput(values: SiteStockFormValues): SiteStockMovementInput {
  return {
    materialId: values.materialId,
    warehouseId: values.warehouseId,
    quantity: values.quantity,
    issuedOn: values.issuedOn,
    note: values.note || undefined,
  };
}

export const materialPlanSchema = z.object({
  planned: z.coerce.number({ invalid_type_error: 'Enter a quantity' }).min(0, "Can't be negative").max(1_000_000_000),
});

export type MaterialPlanFormValues = z.infer<typeof materialPlanSchema>;
