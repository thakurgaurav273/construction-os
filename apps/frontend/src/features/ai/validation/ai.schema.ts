import { z } from 'zod';

const MODEL_PATTERN = /^[A-Za-z0-9._:/-]+$/;

export const providerKeySchema = z.object({
  /** Empty means "keep the saved key" (only valid when one is saved, checked by the form). */
  apiKey: z.union([z.literal(''), z.string().trim().min(10, 'Paste the complete API key').max(500)]),
  model: z.string().trim().max(120).regex(MODEL_PATTERN, 'Enter a model id such as gemini-2.5-flash').or(z.literal('')),
});

export type ProviderKeyValues = z.infer<typeof providerKeySchema>;

export const accessRequestSchema = z.object({
  requestedRequests: z.coerce.number().int().min(10, 'At least 10').max(10_000, 'At most 10,000'),
  reason: z.string().trim().max(1000),
});

export type AccessRequestValues = z.infer<typeof accessRequestSchema>;
