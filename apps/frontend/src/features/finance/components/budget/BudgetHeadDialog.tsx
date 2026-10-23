'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input } from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useCreateBudgetHead, useUpdateBudgetHead } from '@/hooks/api/use-finance';
import { getApiErrorMessage } from '@/lib/api/errors';
import { PROCUREMENT_CATEGORIES } from '@/features/procurement/constants';
import type { BudgetHead } from '../../types';
import { budgetHeadSchema, toBudgetHeadFormValues, toBudgetHeadInput, type BudgetHeadFormValues } from '../../validation/budget-head.schema';

interface BudgetHeadDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set when editing. */
  head?: BudgetHead;
  /** Heads the project already has, left out of the suggestions. */
  existing: string[];
}

export function BudgetHeadDialog({ projectId, open, onOpenChange, head, existing }: BudgetHeadDialogProps): React.ReactElement {
  const createHead = useCreateBudgetHead(projectId);
  const updateHead = useUpdateBudgetHead(projectId);
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<BudgetHeadFormValues>({
    resolver: zodResolver(budgetHeadSchema),
    defaultValues: toBudgetHeadFormValues(head),
  });

  useEffect(() => {
    if (open) reset(toBudgetHeadFormValues(head));
  }, [open, head, reset]);

  async function onSubmit(values: BudgetHeadFormValues): Promise<void> {
    try {
      const input = toBudgetHeadInput(values);
      if (head) await updateHead.mutateAsync({ id: head.id, input });
      else await createHead.mutateAsync(input);
      toast.success(head ? `${input.category} updated` : `${input.category} added to the budget`);
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t save the budget head. Try again.'));
    }
  }

  const taken = new Set(existing.map((name) => name.toLowerCase()));
  const chips = [...PROCUREMENT_CATEGORIES, 'Labour', 'Subcontract'].filter((name) => !taken.has(name.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{head ? `Edit ${head.category}` : 'Add budget head'}</DialogTitle>
          <DialogDescription>
            Orders and vendor bills with the same category count against this head automatically.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Head" htmlFor="budget-head-category" error={errors.category?.message}>
            <Input id="budget-head-category" placeholder="e.g. Steel" {...register('category')} />
          </FormField>
          {!head && (
            <div className="flex flex-wrap gap-1.5" aria-label="Suggestions">
              {chips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setValue('category', chip, { shouldValidate: true })}
                  className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {chip}
                </button>
              ))}
            </div>
          )}
          <FormField label="Allocated (₹)" htmlFor="budget-head-allocated" error={errors.allocated?.message}>
            <Input id="budget-head-allocated" type="number" inputMode="decimal" min={0} step="1" {...register('allocated')} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : head ? 'Save' : 'Add head'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
