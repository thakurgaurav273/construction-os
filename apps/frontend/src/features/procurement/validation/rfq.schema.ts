import { z } from 'zod';
import { DEFAULT_GST_PERCENT, MAX_LINE_ITEMS, MAX_NOTE_LENGTH, MAX_RFQ_VENDORS } from '../constants';
import type { QuoteInput, RfqDetail, RfqInput, RfqInvitation } from '../types';

const isoDay = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

export const rfqSchema = z.object({
  title: z.string().trim().min(3, 'Give the RFQ a title').max(150),
  description: z.string().trim().max(2000),
  projectId: z.string().min(1, 'Select a project'),
  category: z.string().min(1, 'Select a category'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  closingDate: isoDay('Pick a closing date'),
  estimatedValue: z.coerce.number({ invalid_type_error: 'Enter an amount' }).min(0, "Can't be negative"),
  vendorIds: z.array(z.string()).min(1, 'Invite at least one vendor').max(MAX_RFQ_VENDORS),
  items: z
    .array(z.object({
      description: z.string().trim().min(2, 'Describe the item').max(200),
      unit: z.string().trim().min(1, 'Unit').max(20),
      quantity: z.coerce.number({ invalid_type_error: 'Enter a quantity' }).positive('Must be more than 0'),
    }))
    .min(1, 'Add at least one item to quote')
    .max(MAX_LINE_ITEMS),
});

export type RfqFormValues = z.infer<typeof rfqSchema>;

export function emptyRfqFormValues(): RfqFormValues {
  return {
    title: '', description: '', projectId: '', category: '', priority: 'MEDIUM', closingDate: '',
    estimatedValue: 0, vendorIds: [], items: [{ description: '', unit: 'nos', quantity: 1 }],
  };
}

export function toRfqInput(values: RfqFormValues): RfqInput {
  return {
    ...values,
    description: values.description || undefined,
    estimatedValue: values.estimatedValue || undefined,
  };
}

export const quoteSchema = z.object({
  leadTimeDays: z.coerce.number({ invalid_type_error: 'Enter lead time' }).int('Whole days').min(0).max(365, 'Max 365 days'),
  validUntil: z.union([z.literal(''), isoDay('Pick a date')]),
  taxPercent: z.coerce.number({ invalid_type_error: 'Enter GST %' }).min(0).max(100, 'Max 100%'),
  notes: z.string().trim().max(MAX_NOTE_LENGTH),
  rates: z.array(z.object({
    rfqItemId: z.string(),
    rate: z.coerce.number({ invalid_type_error: 'Enter a rate' }).min(0, "Can't be negative"),
  })),
});

export type QuoteFormValues = z.infer<typeof quoteSchema>;

export function toQuoteFormValues(rfq: RfqDetail, invitation: RfqInvitation): QuoteFormValues {
  const existing = new Map(invitation.rates.map((rate) => [rate.rfqItemId, rate.rate]));
  return {
    leadTimeDays: invitation.leadTimeDays ?? 7,
    validUntil: invitation.validUntil?.slice(0, 10) ?? '',
    taxPercent: invitation.status === 'QUOTED' ? invitation.taxPercent : DEFAULT_GST_PERCENT,
    notes: invitation.notes ?? '',
    rates: rfq.items.map((item) => ({ rfqItemId: item.id, rate: existing.get(item.id) ?? 0 })),
  };
}

export function toQuoteInput(values: QuoteFormValues): QuoteInput {
  return {
    leadTimeDays: values.leadTimeDays,
    validUntil: values.validUntil || undefined,
    taxPercent: values.taxPercent,
    notes: values.notes || undefined,
    items: values.rates,
  };
}
