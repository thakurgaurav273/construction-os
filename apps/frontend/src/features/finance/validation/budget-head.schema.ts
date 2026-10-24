import { z } from 'zod';
import type { BudgetHead, BudgetHeadInput } from '../types';

export const budgetHeadSchema = z.object({
  category: z.string().trim().min(1, 'Name the head, e.g. Steel or Electrical').max(60),
  allocated: z.coerce.number({ invalid_type_error: 'Enter the allocation in rupees' })
    .min(0, "The allocation can't be negative")
    .max(1_000_000_000_000, 'That allocation looks too large'),
});

export type BudgetHeadFormValues = z.infer<typeof budgetHeadSchema>;

export function toBudgetHeadFormValues(head?: BudgetHead): BudgetHeadFormValues {
  return { category: head?.category ?? '', allocated: head?.allocated ?? 0 };
}

export function toBudgetHeadInput(values: BudgetHeadFormValues): BudgetHeadInput {
  return { category: values.category.trim(), allocated: Math.round(values.allocated * 100) / 100 };
}
