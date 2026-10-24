import { z } from 'zod';
import type { ImportField, ImportMapping } from '@/hooks/api/use-data-import';

/** Builds the schema for one entity, since which fields are required depends on what is being imported. */
export function buildTemplateSchema(fields: ImportField[]) {
  return z
    .object({
      name: z.string().trim().min(1, 'Name this layout so you can recognise it later').max(80),
      columns: z.record(z.string()),
      defaults: z.record(z.string().trim().max(200, 'Keep fixed values under 200 characters')),
      extras: z.array(z.string()),
    })
    .superRefine((values, context) => {
      for (const field of fields) {
        if (field.required && !values.columns[field.key] && !values.defaults[field.key]?.trim()) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['columns', field.key],
            message: `Pick the column with ${field.label.toLowerCase()}, or enter a value that applies to every row`,
          });
        }
      }
    });
}

export type TemplateFormValues = z.infer<ReturnType<typeof buildTemplateSchema>>;

export function toTemplateFormValues(fields: ImportField[], mapping: ImportMapping, name: string): TemplateFormValues {
  return {
    name,
    columns: Object.fromEntries(fields.map((field) => [field.key, mapping.columns[field.key] ?? ''])),
    defaults: Object.fromEntries(fields.map((field) => [field.key, mapping.defaults[field.key] ?? ''])),
    extras: mapping.extras,
  };
}

export function toImportMapping(values: TemplateFormValues, translations: ImportMapping['values']): ImportMapping {
  const filled = (record: Record<string, string>): Record<string, string> => Object.fromEntries(
    Object.entries(record).map(([key, value]): [string, string] => [key, value.trim()]).filter(([, value]) => value !== ''),
  );
  const columns = filled(values.columns);
  const mapped = new Set(Object.values(columns));
  return {
    columns,
    defaults: filled(values.defaults),
    values: translations,
    extras: values.extras.filter((heading) => !mapped.has(heading)),
  };
}
