import { z } from 'zod';
import { MAX_NOTE_LENGTH } from '../constants';

const isoDay = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

export const scheduleDeliverySchema = z.object({
  scheduledDate: isoDay('Pick the delivery date'),
  trackingId: z.string().trim().max(80),
  notes: z.string().trim().max(MAX_NOTE_LENGTH),
});

export type ScheduleDeliveryFormValues = z.infer<typeof scheduleDeliverySchema>;

export const receiveGoodsSchema = z
  .object({
    receivedAt: isoDay('Pick the date goods arrived'),
    trackingId: z.string().trim().max(80),
    notes: z.string().trim().max(MAX_NOTE_LENGTH),
    lines: z.array(z.object({
      poLineItemId: z.string(),
      outstanding: z.number(),
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
  });

export type ReceiveGoodsFormValues = z.infer<typeof receiveGoodsSchema>;

export const reviewNoteSchema = (required: boolean) =>
  z.object({
    note: required
      ? z.string().trim().min(3, 'Add a note explaining the decision').max(MAX_NOTE_LENGTH)
      : z.string().trim().max(MAX_NOTE_LENGTH),
  });

export type ReviewNoteFormValues = { note: string };
