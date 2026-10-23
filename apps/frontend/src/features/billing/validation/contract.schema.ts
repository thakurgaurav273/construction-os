import { z } from 'zod';
import { MAX_ADJUSTMENTS } from '../constants';
import type { ContractDetail, ContractInput } from '../types';

const optionalDay = z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')]);

export const adjustmentSchema = z.object({
  label: z.string().trim().min(1, 'Name the line').max(80),
  effect: z.enum(['ADD', 'DEDUCT']),
  calculation: z.enum(['PERCENT', 'FIXED']),
  value: z.coerce.number({ invalid_type_error: 'Enter a value' }).min(0, "Can't be negative"),
}).refine((rule) => rule.calculation !== 'PERCENT' || rule.value <= 100, { path: ['value'], message: 'Max 100%' });

export const contractSchema = z.object({
  direction: z.enum(['CLIENT', 'SUBCONTRACT']),
  projectId: z.string().min(1, 'Select a project'),
  partyId: z.string().min(1, 'Choose who this contract is with'),
  reference: z.string().trim().max(80),
  title: z.string().trim().min(3, 'Enter the name of work').max(300),
  startDate: optionalDay,
  endDate: optionalDay,
  notes: z.string().trim().max(2000),
  adjustments: z.array(adjustmentSchema).max(MAX_ADJUSTMENTS),
}).refine((values) => !values.startDate || !values.endDate || values.startDate <= values.endDate, {
  path: ['endDate'],
  message: 'Must be on or after the start date',
});

export type ContractFormValues = z.infer<typeof contractSchema>;
export type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

export function toContractFormValues(contract?: ContractDetail, defaults: Partial<ContractFormValues> = {}): ContractFormValues {
  return {
    direction: contract?.direction ?? defaults.direction ?? 'CLIENT',
    projectId: contract?.project.id ?? defaults.projectId ?? '',
    partyId: contract?.party?.id ?? '',
    reference: contract?.reference ?? '',
    title: contract?.title ?? '',
    startDate: contract?.startDate?.slice(0, 10) ?? '',
    endDate: contract?.endDate?.slice(0, 10) ?? '',
    notes: contract?.notes ?? '',
    adjustments: contract?.adjustments.map(({ label, effect, calculation, value }) => ({ label, effect, calculation, value })) ?? [],
  };
}

export function toContractInput(values: ContractFormValues): ContractInput {
  return {
    direction: values.direction,
    projectId: values.projectId,
    clientId: values.direction === 'CLIENT' ? values.partyId : null,
    vendorId: values.direction === 'SUBCONTRACT' ? values.partyId : null,
    reference: values.reference || null,
    title: values.title,
    startDate: values.startDate || null,
    endDate: values.endDate || null,
    notes: values.notes,
    adjustments: values.adjustments,
  };
}
