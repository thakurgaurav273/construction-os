import { z } from 'zod';

/** Same rules as the backend DTOs (SaveStorageIntegrationDto, SaveEmailIntegrationDto). */
const BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const REGION_PATTERN = /^[a-z]{2}(-gov)?-[a-z]+-\d$/;
const ACCOUNT_ID_PATTERN = /^[a-f0-9]{32}$/i;
const SENDER_PATTERN = /^(?:[^<>@\r\n]{1,100} <)?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/;

export const STORAGE_PROVIDER_OPTIONS = [
  { value: 'r2', label: 'Cloudflare R2' },
  { value: 's3', label: 'Amazon S3 or S3-compatible' },
] as const;

export const storageIntegrationSchema = z
  .object({
    provider: z.enum(['s3', 'r2']),
    bucket: z.string().trim().regex(BUCKET_PATTERN, 'Enter a bucket name: 3–63 lowercase letters, numbers, dots or hyphens'),
    region: z.string().trim(),
    endpoint: z.string().trim().max(300),
    accountId: z.string().trim(),
    accessKeyId: z.string().trim().min(3, 'Enter the access key ID').max(128),
    secretAccessKey: z.string().trim().min(3, 'Enter the secret access key').max(256),
  })
  .superRefine((values, context) => {
    if (values.provider === 'r2' && !ACCOUNT_ID_PATTERN.test(values.accountId)) {
      context.addIssue({ code: 'custom', path: ['accountId'], message: 'Enter the 32-character Cloudflare account ID' });
    }
    if (values.provider !== 's3') return;
    if (values.region && !REGION_PATTERN.test(values.region)) {
      context.addIssue({ code: 'custom', path: ['region'], message: 'Enter a region such as ap-south-1' });
    }
    if (!values.region && !values.endpoint) {
      context.addIssue({ code: 'custom', path: ['region'], message: 'Enter the bucket’s region, e.g. ap-south-1' });
    }
    if (values.endpoint && !/^https?:\/\/\S+$/.test(values.endpoint)) {
      context.addIssue({ code: 'custom', path: ['endpoint'], message: 'Enter a URL such as https://s3.example.com' });
    }
  });

export type StorageIntegrationFormValues = z.infer<typeof storageIntegrationSchema>;

export const emailIntegrationSchema = z.object({
  apiKey: z.string().trim().regex(/^re_[A-Za-z0-9_]{10,}$/, 'Enter a Resend API key (it starts with re_)').max(200),
  fromAddress: z.string().trim().max(200).regex(SENDER_PATTERN, 'Enter a sender such as noreply@yourcompany.com'),
});

export type EmailIntegrationFormValues = z.infer<typeof emailIntegrationSchema>;
