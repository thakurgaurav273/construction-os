import { z } from 'zod';
import type { IssueAgainstRequestInput, MaterialRequestInput } from '@/hooks/api/use-material-requests';

/** Matches the backend's limit on lines per request. */
const MAX_REQUEST_LINES = 50;
const MAX_QUANTITY = 1_000_000_000;

const quantity = z.coerce
  .number({ invalid_type_error: 'Enter a quantity' })
  .max(MAX_QUANTITY);

export const materialRequestSchema = z.object({
  projectId: z.string().min(1, 'Choose a project'),
  neededBy: z.string(),
  note: z.string().trim().max(1000),
  items: z
    .array(z.object({
      materialId: z.string().min(1, 'Choose a material'),
      quantity: quantity.positive('Enter a quantity above zero'),
    }))
    .min(1, 'Add at least one material')
    .max(MAX_REQUEST_LINES, `A request can have up to ${MAX_REQUEST_LINES} materials`)
    .superRefine((items, context) => {
      const seen = new Set<string>();
      items.forEach((item, index) => {
        if (item.materialId && seen.has(item.materialId)) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: [index, 'materialId'], message: 'Already on this request' });
        }
        seen.add(item.materialId);
      });
    }),
});

export type MaterialRequestFormValues = z.infer<typeof materialRequestSchema>;

export function toMaterialRequestInput(values: MaterialRequestFormValues): MaterialRequestInput {
  return {
    projectId: values.projectId,
    neededBy: values.neededBy || undefined,
    note: values.note || undefined,
    items: values.items.map((item) => ({ materialId: item.materialId, quantity: item.quantity })),
  };
}

export const issueRequestSchema = z.object({
  warehouseId: z.string().min(1, 'Choose a store'),
  issuedOn: z.string().min(1, 'Choose a date'),
  note: z.string().trim().max(500),
  lines: z
    .array(z.object({
      itemId: z.string(),
      /** Still owed on the line, so the form can refuse over-issuing before the server does. */
      remaining: z.number(),
      quantity: quantity.min(0, "Can't be negative"),
    }))
    .superRefine((lines, context) => {
      lines.forEach((line, index) => {
        if (line.quantity > line.remaining) {
          context.addIssue({ code: z.ZodIssueCode.custom, path: [index, 'quantity'], message: `Only ${line.remaining} still owed` });
        }
      });
      if (!lines.some((line) => line.quantity > 0)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a quantity for at least one material' });
      }
    }),
});

export type IssueRequestFormValues = z.infer<typeof issueRequestSchema>;

export function toIssueRequestInput(values: IssueRequestFormValues): IssueAgainstRequestInput {
  return {
    warehouseId: values.warehouseId,
    issuedOn: values.issuedOn,
    note: values.note || undefined,
    lines: values.lines.filter((line) => line.quantity > 0).map((line) => ({ itemId: line.itemId, quantity: line.quantity })),
  };
}
