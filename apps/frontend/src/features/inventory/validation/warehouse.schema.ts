import { z } from 'zod';
import type { LocationInput, WarehouseDetail, WarehouseInput, WarehouseType } from '@/hooks/api/use-inventory';

const CODE_PATTERN = /^[A-Za-z0-9-]+$/;

export const WAREHOUSE_TYPES: { value: WarehouseType; label: string }[] = [
  { value: 'CENTRAL', label: 'Central warehouse' },
  { value: 'SITE_STORE', label: 'Site store' },
  { value: 'YARD', label: 'Yard' },
  { value: 'TRANSIT', label: 'Transit' },
];

export const warehouseSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter the store name').max(120),
    code: z.string().trim().min(1, 'Enter a store code').max(30).regex(CODE_PATTERN, 'Letters, digits and hyphens only'),
    type: z.enum(['CENTRAL', 'SITE_STORE', 'YARD', 'TRANSIT']),
    projectId: z.string(),
    address: z.string().trim().max(250),
    city: z.string().trim().max(80),
    manager: z.string().trim().max(120),
    capacity: z.union([z.literal(''), z.coerce.number().min(0, "Can't be negative")]),
  })
  .refine((values) => values.type !== 'SITE_STORE' || values.projectId !== '', {
    message: 'A site store belongs to a project',
    path: ['projectId'],
  });

export type WarehouseFormValues = z.infer<typeof warehouseSchema>;

export function toWarehouseFormValues(warehouse?: WarehouseDetail): WarehouseFormValues {
  return {
    name: warehouse?.name ?? '',
    code: warehouse?.code ?? '',
    type: warehouse?.type ?? 'SITE_STORE',
    projectId: warehouse?.projectId ?? '',
    address: warehouse?.address ?? '',
    city: warehouse?.city ?? '',
    manager: warehouse?.manager ?? '',
    capacity: warehouse?.capacity ?? '',
  };
}

export function toWarehouseInput(values: WarehouseFormValues): WarehouseInput {
  return {
    name: values.name,
    code: values.code.toUpperCase(),
    type: values.type,
    projectId: values.projectId || null,
    address: values.address || null,
    city: values.city || null,
    manager: values.manager || null,
    capacity: values.capacity === '' ? null : values.capacity,
  };
}

export const locationSchema = z.object({
  code: z.string().trim().min(1, 'Enter a bin code').max(30).regex(CODE_PATTERN, 'Letters, digits and hyphens only'),
  name: z.string().trim().min(1, 'Enter a name').max(80),
  zone: z.string().trim().max(60),
});

export type LocationFormValues = z.infer<typeof locationSchema>;

export function toLocationInput(values: LocationFormValues): LocationInput {
  return { code: values.code.toUpperCase(), name: values.name, zone: values.zone || null };
}
