import { z } from 'zod';
import type { CreateTransferInput } from '@/hooks/api/use-inventory';

export const transferSchema = z
  .object({
    fromWarehouseId: z.string().min(1, 'Choose the store sending the stock'),
    toWarehouseId: z.string().min(1, 'Choose the store receiving the stock'),
    note: z.string().trim().max(1000),
    lines: z
      .array(z.object({
        materialId: z.string().min(1, 'Choose a material'),
        quantity: z.coerce.number({ invalid_type_error: 'Enter a quantity' }).positive('Enter a quantity above zero'),
      }))
      .min(1, 'Add at least one material')
      .max(100),
  })
  .refine((values) => values.fromWarehouseId !== values.toWarehouseId, {
    message: 'Choose a different store',
    path: ['toWarehouseId'],
  })
  .refine((values) => new Set(values.lines.map((line) => line.materialId)).size === values.lines.length, {
    message: 'Each material can appear only once',
    path: ['lines'],
  });

export type TransferFormValues = z.infer<typeof transferSchema>;

export const EMPTY_TRANSFER_LINE: TransferFormValues['lines'][number] = { materialId: '', quantity: 0 };

export function toTransferInput(values: TransferFormValues): CreateTransferInput {
  return {
    fromWarehouseId: values.fromWarehouseId,
    toWarehouseId: values.toWarehouseId,
    note: values.note || undefined,
    items: values.lines.map((line) => ({ materialId: line.materialId, quantity: line.quantity })),
  };
}
