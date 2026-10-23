import { z } from 'zod';
import { MAX_NOTE_LENGTH } from '../constants';

const isoDay = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

export const scheduleDeliverySchema = z.object({
  scheduledDate: isoDay('Pick the delivery date'),
  trackingId: z.string().trim().max(80),
  notes: z.string().trim().max(MAX_NOTE_LENGTH),
});

export type ScheduleDeliveryFormValues = z.infer<typeof scheduleDeliverySchema>;

/** Line not posted to stock (services, hire, one-off items). Radix Select needs a non-empty sentinel. */
export const NOT_STOCKED = 'none';

export const receiveGoodsSchema = z
  .object({
    receivedAt: isoDay('Pick the date goods arrived'),
    trackingId: z.string().trim().max(80),
    notes: z.string().trim().max(MAX_NOTE_LENGTH),
    warehouseId: z.string(),
    lines: z.array(z.object({
      poLineItemId: z.string(),
      outstanding: z.number(),
      /** Already linked to a material on the PO; the link can't be changed here. */
      linkedMaterialId: z.string().nullable(),
      materialId: z.string(),
      quantity: z.coerce.number({ invalid_type_error: 'Enter a quantity' }).min(0, "Can't be negative"),
    })),
  })
  .superRefine((values, ctx) => {
    values.lines.forEach((line, index) => {
      if (line.quantity > line.outstanding) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['lines', index, 'quantity'],
          message: `Only ${line.outstanding} outstanding`,
        });
      }
    });
    if (!values.lines.some((line) => line.quantity > 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lines'], message: 'Enter the quantity received for at least one line.' });
    }
    const postsToStock = values.lines.some((line) => line.quantity > 0 && (line.linkedMaterialId || line.materialId !== NOT_STOCKED));
    if (postsToStock && !values.warehouseId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['warehouseId'], message: 'Choose the store receiving the stock' });
    }
  });

export type ReceiveGoodsFormValues = z.infer<typeof receiveGoodsSchema>;
