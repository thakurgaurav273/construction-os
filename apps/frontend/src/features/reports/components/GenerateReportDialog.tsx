'use client';

import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useGenerateReport } from '@/hooks/api/use-reports';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { GeneratedReport, ReportTemplate } from '../types';
import {
  generateReportSchema, toGenerateReportFormValues, toGenerateReportInput, type GenerateReportFormValues,
} from '../validation/report.schema';
import { AiSummaryToggle } from './AiSummaryToggle';
import { FormatSelect } from './FormatSelect';
import { ProjectPicker } from './ProjectPicker';

interface GenerateReportDialogProps {
  template: ReportTemplate | null;
  onOpenChange: (open: boolean) => void;
  onQueued: (report: GeneratedReport) => void;
}

export function GenerateReportDialog({ template, onOpenChange, onQueued }: GenerateReportDialogProps): React.ReactElement {
  const generate = useGenerateReport();
  const { register, control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<GenerateReportFormValues>({
    resolver: zodResolver(generateReportSchema),
    defaultValues: template ? toGenerateReportFormValues(template) : undefined,
  });

  useEffect(() => {
    if (template) reset(toGenerateReportFormValues(template));
  }, [template, reset]);

  async function onSubmit(values: GenerateReportFormValues): Promise<void> {
    if (!template) return;
    try {
      const report = await generate.mutateAsync(toGenerateReportInput(template, values));
      toast.success('Report queued', { description: 'It will be ready to download in a moment.' });
      onOpenChange(false);
      onQueued(report);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t start the report. Try again.'));
    }
  }

  return (
    <Dialog open={template !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Generate {template?.name}</DialogTitle>
          <DialogDescription>{template?.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <FormField label="Report name" htmlFor="report-name" error={errors.name?.message}>
            <Input id="report-name" {...register('name')} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From" htmlFor="report-from" error={errors.periodFrom?.message}>
              <Input id="report-from" type="date" {...register('periodFrom')} />
            </FormField>
            <FormField label="To" htmlFor="report-to" error={errors.periodTo?.message}>
              <Input id="report-to" type="date" {...register('periodTo')} />
            </FormField>
          </div>
          <FormField label="Projects" htmlFor="report-projects" error={errors.projectIds?.message}>
            <Controller control={control} name="projectIds" render={({ field }) => <ProjectPicker id="report-projects" value={field.value} onChange={field.onChange} />} />
          </FormField>
          <FormField label="Format" htmlFor="report-format">
            <Controller control={control} name="format" render={({ field }) => <FormatSelect id="report-format" value={field.value} onChange={field.onChange} />} />
          </FormField>
          <Controller
            control={control}
            name="includeAiSummary"
            render={({ field }) => <AiSummaryToggle id="report-ai" checked={field.value} onChange={field.onChange} />}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Starting…' : 'Generate'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
