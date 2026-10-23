import { z } from 'zod';
import type { MeasurementInput, RaBillDetail, RaBillInput, RaBillLine } from '../types';

const day = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);

export const raBillSchema = z.object({
  periodFrom: day('Pick the first day of the period'),
  periodTo: day('Pick the last day of the period'),
  reference: z.string().trim().max(80),
  notes: z.string().trim().max(2000),
}).refine((values) => values.periodFrom <= values.periodTo, { path: ['periodTo'], message: 'Must be on or after the start' });

export type RaBillFormValues = z.infer<typeof raBillSchema>;

const firstOfThisMonth = (): string => `${new Date().toISOString().slice(0, 8)}01`;

/**
 * A new bill starts the day after the last certified one ended; the first bill starts with the contract,
 * or on the 1st of this month when the contract has no start date.
 */
export function toRaBillFormValues(bill?: RaBillDetail, previousPeriodTo?: string, contractStart?: string | null): RaBillFormValues {
  const nextStart = previousPeriodTo
    ? new Date(new Date(previousPeriodTo).getTime() + 86_400_000).toISOString().slice(0, 10)
    : contractStart?.slice(0, 10) ?? firstOfThisMonth();
  return {
    periodFrom: bill?.periodFrom.slice(0, 10) ?? nextStart,
    periodTo: bill?.periodTo.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    reference: bill?.reference ?? '',
    notes: bill?.notes ?? '',
  };
}

export function toRaBillInput(values: RaBillFormValues): RaBillInput {
  return { ...values, reference: values.reference || null };
}

/** Number inputs hold '' while empty; blank means "not used" for dimensions. */
const optionalNumber = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? null : value),
  z.coerce.number({ invalid_type_error: 'Enter a number' }).min(0, "Can't be negative").nullable(),
);

export const measurementRowSchema = z.object({
  description: z.string().trim().min(1, 'Describe the measurement').max(300),
  type: z.enum(['DIMENSIONS', 'STEEL', 'DIRECT']),
  nos: optionalNumber,
  length: optionalNumber,
  breadth: optionalNumber,
  height: optionalNumber,
  unitWeight: optionalNumber,
  quantity: optionalNumber,
  isDeduction: z.boolean(),
}).superRefine((row, context) => {
  if (row.type === 'DIRECT' && row.quantity === null) context.addIssue({ code: 'custom', path: ['quantity'], message: 'Enter the quantity' });
  if (row.type === 'STEEL' && row.length === null) context.addIssue({ code: 'custom', path: ['length'], message: 'Enter the cut length' });
  if (row.type === 'STEEL' && row.unitWeight === null) context.addIssue({ code: 'custom', path: ['unitWeight'], message: 'Enter kg per metre' });
});

export const measurementsSchema = z.object({ rows: z.array(measurementRowSchema).max(300) });

export type MeasurementsFormValues = z.infer<typeof measurementsSchema>;
export type MeasurementRowValues = z.infer<typeof measurementRowSchema>;

export function emptyMeasurement(type: MeasurementRowValues['type'] = 'DIMENSIONS'): MeasurementRowValues {
  return { description: '', type, nos: 1, length: null, breadth: null, height: null, unitWeight: null, quantity: null, isDeduction: false };
}

export function toMeasurementsFormValues(line: RaBillLine): MeasurementsFormValues {
  return { rows: line.measurements.map(({ id: _id, ...row }) => row) };
}

/** Only the inputs that matter for each type are sent, so a switched type never carries stale numbers. */
export function toMeasurementInputs(values: MeasurementsFormValues): MeasurementInput[] {
  return values.rows.map((row) => ({
    description: row.description,
    type: row.type,
    isDeduction: row.isDeduction,
    nos: row.type === 'DIRECT' ? null : row.nos,
    length: row.type === 'DIRECT' ? null : row.length,
    breadth: row.type === 'DIMENSIONS' ? row.breadth : null,
    height: row.type === 'DIMENSIONS' ? row.height : null,
    unitWeight: row.type === 'STEEL' ? row.unitWeight : null,
    quantity: row.type === 'DIRECT' ? row.quantity : null,
  }));
}

export const certifySchema = z.object({
  lines: z.array(z.object({
    contractItemId: z.string(),
    claimedQuantity: z.number(),
    certifiedQuantity: z.coerce.number({ invalid_type_error: 'Enter a quantity' }).min(0, "Can't be negative"),
    note: z.string().trim().max(300),
  }).refine((line) => line.certifiedQuantity <= line.claimedQuantity, { path: ['certifiedQuantity'], message: "Can't exceed the claim" })),
  note: z.string().trim().max(1000),
  invoiceNumber: z.string().trim().max(60),
});

export type CertifyFormValues = z.infer<typeof certifySchema>;

export function toCertifyFormValues(bill: RaBillDetail): CertifyFormValues {
  return {
    lines: bill.lines
      .filter((line) => line.claimedQuantity > 0)
      .map((line) => ({ contractItemId: line.contractItemId, claimedQuantity: line.claimedQuantity, certifiedQuantity: line.claimedQuantity, note: '' })),
    note: '',
    invoiceNumber: '',
  };
}
