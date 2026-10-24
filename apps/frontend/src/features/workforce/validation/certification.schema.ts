import { z } from 'zod';
import type { Certification, CertificationInput } from '@/hooks/api/use-workforce';

const optionalDay = z.union([z.literal(''), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')]);

export const certificationSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter the certificate name, e.g. Safety Induction').max(120),
    issuer: z.string().trim().max(120),
    certificateNumber: z.string().trim().max(60),
    issuedOn: optionalDay,
    expiresOn: optionalDay,
  })
  .refine((values) => !values.issuedOn || !values.expiresOn || values.expiresOn >= values.issuedOn, {
    path: ['expiresOn'],
    message: 'The expiry date must be on or after the issue date.',
  });

export type CertificationFormValues = z.infer<typeof certificationSchema>;

export function toCertificationFormValues(certification?: Certification): CertificationFormValues {
  return {
    name: certification?.name ?? '',
    issuer: certification?.issuer ?? '',
    certificateNumber: certification?.certificateNumber ?? '',
    issuedOn: certification?.issuedOn ?? '',
    expiresOn: certification?.expiresOn ?? '',
  };
}

export function toCertificationInput(values: CertificationFormValues): CertificationInput {
  return {
    name: values.name.trim(),
    issuer: values.issuer.trim() || null,
    certificateNumber: values.certificateNumber.trim() || null,
    issuedOn: values.issuedOn || null,
    expiresOn: values.expiresOn || null,
  };
}
