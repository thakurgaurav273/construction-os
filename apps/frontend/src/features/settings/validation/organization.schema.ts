import { z } from 'zod';
import type { OrganizationSettings, OrganizationSettingsInput } from '@/hooks/api/use-settings';

/** Same rule as the backend: state code, PAN, entity number, the letter Z, checksum. */
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SAR', 'QAR', 'SGD', 'AUD'] as const;

export const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Riyadh', 'Asia/Qatar', 'Asia/Singapore', 'Europe/London', 'Europe/Berlin',
  'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC',
] as const;

export const organizationSchema = z.object({
  name: z.string().trim().min(2, 'Enter the organization name').max(150),
  address: z.string().trim().max(500),
  gstNumber: z.union([
    z.literal(''),
    z.string().trim().toUpperCase().regex(GSTIN_PATTERN, 'Enter a valid 15-character GSTIN'),
  ]),
  currency: z.enum(CURRENCIES),
  timezone: z.string().min(1, 'Choose a time zone'),
});

export type OrganizationFormValues = z.infer<typeof organizationSchema>;

export function toOrganizationFormValues(organization?: OrganizationSettings): OrganizationFormValues {
  const currency = CURRENCIES.find((code) => code === organization?.currency) ?? 'INR';
  return {
    name: organization?.name ?? '',
    address: organization?.address ?? '',
    gstNumber: organization?.gstNumber ?? '',
    currency,
    timezone: organization?.timezone ?? 'Asia/Kolkata',
  };
}

export function toOrganizationInput(values: OrganizationFormValues): OrganizationSettingsInput {
  return {
    name: values.name,
    address: values.address || null,
    gstNumber: values.gstNumber || null,
    currency: values.currency,
    timezone: values.timezone,
  };
}
