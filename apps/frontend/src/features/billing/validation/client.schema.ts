import { z } from 'zod';
import type { Client, ClientInput } from '../types';

/** Same rule as the backend: state code, PAN, entity number, the letter Z, checksum. */
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

export const clientSchema = z.object({
  name: z.string().trim().min(2, 'Enter the client name').max(150),
  contactPerson: z.string().trim().max(120),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email address').max(120)]),
  phone: z.string().trim().max(30),
  gstNumber: z.union([z.literal(''), z.string().trim().toUpperCase().regex(GSTIN_PATTERN, 'Enter a valid 15-character GSTIN')]),
  address: z.string().trim().max(500),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

export function toClientFormValues(client?: Client): ClientFormValues {
  return {
    name: client?.name ?? '',
    contactPerson: client?.contactPerson ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    gstNumber: client?.gstNumber ?? '',
    address: client?.address ?? '',
  };
}

export function toClientInput(values: ClientFormValues): ClientInput {
  return {
    name: values.name,
    contactPerson: values.contactPerson || null,
    email: values.email || null,
    phone: values.phone || null,
    gstNumber: values.gstNumber || null,
    address: values.address || null,
  };
}
