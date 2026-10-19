import { z } from 'zod';
import type { Vendor, VendorInput } from '../types';

/** Indian GSTIN: state code, PAN, entity number, the letter Z, checksum. Same pattern as the backend DTO. */
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

export const vendorSchema = z.object({
  name: z.string().trim().min(2, 'Enter the vendor name').max(150),
  code: z.string().trim().max(30).regex(/^[A-Za-z0-9-]*$/, 'Letters, digits and hyphens only'),
  categories: z.array(z.string()).max(12),
  contactPerson: z.string().trim().max(120),
  phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/, 'Use digits, spaces, +, ( ) or -'),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email').max(120)]),
  gstNumber: z.union([
    z.literal(''),
    z.string().trim().toUpperCase().regex(GSTIN_PATTERN, 'Enter a valid 15-character GSTIN'),
  ]),
  paymentTerms: z.string().trim().max(60),
  city: z.string().trim().max(80),
  state: z.string().trim().max(80),
});

export type VendorFormValues = z.infer<typeof vendorSchema>;

export function toVendorFormValues(vendor?: Vendor): VendorFormValues {
  return {
    name: vendor?.name ?? '',
    code: vendor?.code ?? '',
    categories: vendor?.categories ?? [],
    contactPerson: vendor?.contactPerson ?? '',
    phone: vendor?.phone ?? '',
    email: vendor?.email ?? '',
    gstNumber: vendor?.gstNumber ?? '',
    paymentTerms: vendor?.paymentTerms ?? '',
    city: vendor?.city ?? '',
    state: vendor?.state ?? '',
  };
}

export function toVendorInput(values: VendorFormValues): VendorInput {
  return {
    name: values.name,
    // Left blank, the backend generates the next VN-0001 style code.
    code: values.code || undefined,
    categories: values.categories,
    contactPerson: values.contactPerson || null,
    phone: values.phone || null,
    email: values.email || null,
    gstNumber: values.gstNumber || null,
    paymentTerms: values.paymentTerms || null,
    city: values.city || null,
    state: values.state || null,
  };
}
