'use client';

import React, { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetDescription,
  SheetFooter, SheetHeader, SheetTitle,
} from '@sitepilot/ui';
import { FormField } from '@/components/shared/FormField';
import { useCreateSchedule, useUpdateSchedule } from '@/hooks/api/use-reports';
import { useOrganizationSettings } from '@/hooks/api/use-settings';
import { getApiErrorMessage } from '@/lib/api/errors';
import { FREQUENCY_LABELS, FREQUENCY_WINDOWS, TIMEZONES } from '../report-presentation';
import type { ReportSchedule, ReportTemplate, ScheduleFrequency } from '../types';
import { scheduleSchema, toScheduleFormValues, toScheduleInput, type ScheduleFormValues } from '../validation/report.schema';
import { AiSummaryToggle } from './AiSummaryToggle';
import { FormatSelect } from './FormatSelect';
import { ProjectPicker } from './ProjectPicker';
import { RecipientRolesPicker } from './RecipientRolesPicker';

const FREQUENCIES = Object.keys(FREQUENCY_LABELS) as ScheduleFrequency[];

interface ScheduleReportSheetProps {
  /** The report type being scheduled; null closes the sheet. */
  template: ReportTemplate | null;
  /** Set when editing an existing schedule. */
  schedule?: ReportSchedule;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleReportSheet({ template, schedule, onOpenChange }: ScheduleReportSheetProps): React.ReactElement {
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const { data: organization } = useOrganizationSettings();
  const defaultTimezone = organization?.timezone ?? 'Asia/Kolkata';
  const { register, control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: template ? toScheduleFormValues(template, schedule, defaultTimezone) : undefined,
  });
  const frequency = watch('frequency');
  const timezones = [...new Set([defaultTimezone, ...TIMEZONES, ...(schedule ? [schedule.timezone] : [])])];

  useEffect(() => {
    if (template) reset(toScheduleFormValues(template, schedule, defaultTimezone));
  }, [template, schedule, defaultTimezone, reset]);

  async function onSubmit(values: ScheduleFormValues): Promise<void> {
    if (!template) return;
    try {
      const input = toScheduleInput(values);
      if (schedule) await updateSchedule.mutateAsync({ id: schedule.id, input });
      else await createSchedule.mutateAsync({ ...input, reportType: template.id });
      toast.success(schedule ? 'Schedule updated' : 'Report scheduled', { description: 'Recipients get it by email at the time you chose.' });
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t save the schedule. Try again.'));
    }
  }

  return (
    <Sheet open={template !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{schedule ? 'Edit schedule' : `Schedule ${template?.name ?? 'report'}`}</SheetTitle>
          <SheetDescription>Generated automatically and emailed with the PDF or Excel file attached.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 flex flex-1 flex-col gap-4" noValidate>
          <FormField label="Name" htmlFor="schedule-name" error={errors.name?.message}>
            <Input id="schedule-name" {...register('name')} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Frequency" htmlFor="schedule-frequency" hint={`Each run covers ${FREQUENCY_WINDOWS[frequency]}.`}>
              <Controller
                control={control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(next) => field.onChange(FREQUENCIES.find((option) => option === next) ?? 'WEEKLY')}>
                    <SelectTrigger id="schedule-frequency"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((option) => <SelectItem key={option} value={option}>{FREQUENCY_LABELS[option]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
            <FormField label="Time" htmlFor="schedule-time" error={errors.time?.message}>
              <Input id="schedule-time" type="time" {...register('time')} />
            </FormField>
          </div>
          <FormField label="Time zone" htmlFor="schedule-timezone">
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="schedule-timezone"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {timezones.map((timezone) => <SelectItem key={timezone} value={timezone}>{timezone}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField label="Projects" htmlFor="schedule-projects" error={errors.projects?.message}>
            <Controller control={control} name="projects" render={({ field }) => <ProjectPicker id="schedule-projects" value={field.value} onChange={field.onChange} />} />
          </FormField>
          <FormField
            label="Send to roles"
            htmlFor="schedule-recipients"
            error={errors.recipients?.message}
            hint={template?.id === 'FINANCIAL' ? 'Financial reports only go to roles with finance access.' : 'Everyone in the organization with these roles.'}
          >
            <Controller control={control} name="recipients" render={({ field }) => <RecipientRolesPicker id="schedule-recipients" value={field.value} onChange={field.onChange} />} />
          </FormField>
          <FormField label="Also send to (optional)" htmlFor="schedule-emails" error={errors.emails?.message} hint="Comma-separated, e.g. a client or consultant.">
            <Input id="schedule-emails" placeholder="pm@company.com, consultant@firm.com" {...register('emails')} />
          </FormField>
          <FormField label="Format" htmlFor="schedule-format">
            <Controller control={control} name="outputFormat" render={({ field }) => <FormatSelect id="schedule-format" value={field.value} onChange={field.onChange} />} />
          </FormField>
          <Controller
            control={control}
            name="includeAiSummary"
            render={({ field }) => <AiSummaryToggle id="schedule-ai" checked={field.value} onChange={field.onChange} />}
          />
          <SheetFooter className="mt-auto gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save schedule'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
