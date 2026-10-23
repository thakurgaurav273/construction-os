import { z } from 'zod';
import type { ReceiptInput, RetentionReleaseInput } from '../types';

export const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
] as const;

const today = (): string => new Date().toISOString().slice(0, 10);
const pastDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date').refine((value) => value <= today(), "Can't be in the future");

/** `max` is the outstanding or held amount, so the form catches over-recording before the server does. */
export const receiptSchema = (max: number) => z.object({
  amount: z.coerce.number({ invalid_type_error: 'Enter the amount' }).positive('Enter the amount').max(max + 0.005, 'More than what is outstanding'),
  receivedDate: pastDay,
  method: z.enum(['bank_transfer', 'cheque', 'upi', 'cash']),
  reference: z.string().trim().max(100),
  notes: z.string().trim().max(1000),
});

export type ReceiptFormValues = z.infer<ReturnType<typeof receiptSchema>>;

export function toReceiptFormValues(outstanding: number): ReceiptFormValues {
  return { amount: outstanding, receivedDate: today(), method: 'bank_transfer', reference: '', notes: '' };
}

export function toReceiptInput(values: ReceiptFormValues): ReceiptInput {
  return values;
}

export const retentionReleaseSchema = (max: number) => z.object({
  amount: z.coerce.number({ invalid_type_error: 'Enter the amount' }).positive('Enter the amount').max(max + 0.005, 'More than the retention held'),
  releasedOn: pastDay,
  reference: z.string().trim().max(100),
  note: z.string().trim().max(1000),
});

export type RetentionReleaseFormValues = z.infer<ReturnType<typeof retentionReleaseSchema>>;

export function toRetentionReleaseFormValues(balance: number): RetentionReleaseFormValues {
  return { amount: balance, releasedOn: today(), reference: '', note: '' };
}

export function toRetentionReleaseInput(values: RetentionReleaseFormValues): RetentionReleaseInput {
  return values;
}
