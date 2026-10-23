'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useSetMaterialPlan, type ProjectMaterialLine } from '@/hooks/api/use-materials';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatNumber } from '@/lib/utils';
import { materialPlanSchema, type MaterialPlanFormValues } from '../validation/site-stock.schema';

interface MaterialPlanDialogProps {
  projectId: string;
  /** The material line being planned; null closes the dialog. */
  line: ProjectMaterialLine | null;
  onClose: () => void;
}

/** Sets how much of a material the project expects to use, so the site can see what's left against plan. */
export function MaterialPlanDialog({ projectId, line, onClose }: MaterialPlanDialogProps): React.ReactElement {
  const setPlan = useSetMaterialPlan();
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MaterialPlanFormValues>({
    resolver: zodResolver(materialPlanSchema),
    defaultValues: { planned: 0 },
  });

  useEffect(() => {
    if (line) reset({ planned: line.planned });
  }, [line, reset]);

  async function onSubmit(values: MaterialPlanFormValues): Promise<void> {
    if (!line) return;
    try {
      await setPlan.mutateAsync({ projectId, materialId: line.materialId, planned: values.planned });
      toast.success(`Plan for ${line.name} updated`);
      onClose();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update the plan. Try again."));
    }
  }

  return (
    <Dialog open={!!line} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Planned Quantity</DialogTitle>
          <DialogDescription>
            {line
              ? `How much ${line.name} this project needs in total, e.g. from the BOQ. ${formatNumber(line.consumed)} ${line.unit} issued so far.`
              : ''}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label={line ? `Planned (${line.unit})` : 'Planned'} htmlFor="material-plan" error={errors.planned?.message}>
            <Input id="material-plan" type="number" step="any" min={0} autoFocus {...register('planned')} />
          </FormField>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save Plan'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
