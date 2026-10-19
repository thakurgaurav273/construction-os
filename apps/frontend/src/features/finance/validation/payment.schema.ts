import { z } from 'zod';

const isoDay = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);
const paymentMethod = z.enum(['bank_transfer', 'cheque', 'upi', 'cash']);

/** `maxAmount` is the invoice balance not yet covered by other payments. */
export const paymentSchema = (maxAmount: number) =>
  z.object({
    amount: z.coerce
      .number({ invalid_type_error: 'Enter an amount' })
      .positive('Must be more than 0')
      .max(maxAmount, `Only ₹${maxAmount.toLocaleString('en-IN')} is left to schedule`),
    dueDate: isoDay('Pick the planned payment date'),
    method: paymentMethod,
    notes: z.string().trim().max(1000),
  });

export type PaymentFormValues = z.infer<ReturnType<typeof paymentSchema>>;

export const markPaidSchema = z.object({
  paidDate: isoDay('Pick the date the money left the account'),
  reference: z.string().trim().min(3, 'Enter the UTR or cheque number').max(80),
  method: paymentMethod,
});

export type MarkPaidFormValues = z.infer<typeof markPaidSchema>;
