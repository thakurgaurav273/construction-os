'use client';

import { useFormContext } from 'react-hook-form';
import { Calendar, CheckCircle2, CloudRain, FileText, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Input, Label, Textarea } from '@sitepilot/ui';
import type { DailyReportFormValues } from '../validation/daily-report.schema';

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive" role="alert">{message}</p>;
}

export function GeneralInfoCard() {
  const { register, formState: { errors } } = useFormContext<DailyReportFormValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <Calendar className="mr-2 h-5 w-5 text-muted-foreground" /> General Information
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="report-date">Date</Label>
          <Input id="report-date" type="date" {...register('date')} />
          <FieldError message={errors.date?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-weather">Weather</Label>
          <div className="relative">
            <CloudRain className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="report-weather" className="pl-9" placeholder="e.g. Clear, 31°C" {...register('weather')} />
          </div>
          <FieldError message={errors.weather?.message} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-progress">Overall Progress %</Label>
          <Input
            id="report-progress"
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            placeholder="0–100"
            {...register('overallProgress')}
          />
          <FieldError message={errors.overallProgress?.message} />
        </div>
      </CardContent>
    </Card>
  );
}

export function WorkCompletedCard() {
  const { register, formState: { errors } } = useFormContext<DailyReportFormValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <CheckCircle2 className="mr-2 h-5 w-5 text-muted-foreground" /> Work Completed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="report-work" className="sr-only">Work completed</Label>
        <Textarea
          id="report-work"
          className="min-h-[120px]"
          placeholder="What was completed on site today? Activities, locations and quantities."
          {...register('workCompleted')}
        />
        <FieldError message={errors.workCompleted?.message} />
      </CardContent>
    </Card>
  );
}

const LABOUR_FIELDS = [
  { key: 'skilled', label: 'Skilled' },
  { key: 'unskilled', label: 'Unskilled' },
  { key: 'supervisors', label: 'Supervisors' },
] as const;

export function LabourCard() {
  const { register, watch, formState: { errors } } = useFormContext<DailyReportFormValues>();
  const labour = watch('labour');
  const totalOnSite = [labour.skilled, labour.unskilled, labour.supervisors]
    .map((count) => Number(count) || 0)
    .reduce((sum, count) => sum + count, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-lg flex items-center">
          <Users className="mr-2 h-5 w-5 text-muted-foreground" /> Labour on Site
        </CardTitle>
        <span className="text-sm text-muted-foreground">
          Total <span className="font-semibold text-foreground">{totalOnSite}</span>
        </span>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {LABOUR_FIELDS.map(({ key, label }) => (
          <div key={key} className="space-y-2">
            <Label htmlFor={`labour-${key}`}>{label}</Label>
            <Input id={`labour-${key}`} type="number" inputMode="numeric" min={0} {...register(`labour.${key}`)} />
            <FieldError message={errors.labour?.[key]?.message} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function RemarksCard() {
  const { register, formState: { errors } } = useFormContext<DailyReportFormValues>();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center">
          <FileText className="mr-2 h-5 w-5 text-muted-foreground" /> Remarks
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Label htmlFor="report-remarks" className="sr-only">Remarks</Label>
        <Textarea
          id="report-remarks"
          className="min-h-[96px]"
          placeholder="Inspections, visitors, instructions received, plan for tomorrow…"
          {...register('remarks')}
        />
        <FieldError message={errors.remarks?.message} />
      </CardContent>
    </Card>
  );
}
