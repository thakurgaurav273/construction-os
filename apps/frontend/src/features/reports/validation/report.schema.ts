import { z } from 'zod';
import type { GenerateReportInput, ReportFormat, ReportSchedule, ReportTemplate, ScheduleFrequency, ScheduleInput } from '../types';

const day = (message: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, message);
const FORMATS = ['PDF', 'EXCEL', 'BOTH'] as const satisfies readonly ReportFormat[];
const FREQUENCIES = ['ONCE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const satisfies readonly ScheduleFrequency[];
const MAX_REPORT_DAYS = 366;

export const generateReportSchema = z.object({
  name: z.string().trim().min(1, 'Give the report a name').max(150),
  periodFrom: day('Pick the first day'),
  periodTo: day('Pick the last day'),
  projectIds: z.array(z.string()).max(50, 'Choose at most 50 projects'),
  format: z.enum(FORMATS),
  includeAiSummary: z.boolean(),
})
  .refine((values) => values.periodFrom <= values.periodTo, { path: ['periodTo'], message: 'Must be on or after the start' })
  .refine(
    (values) => (new Date(values.periodTo).getTime() - new Date(values.periodFrom).getTime()) / 86_400_000 < MAX_REPORT_DAYS,
    { path: ['periodFrom'], message: `A report can cover at most ${MAX_REPORT_DAYS} days` },
  );

export type GenerateReportFormValues = z.infer<typeof generateReportSchema>;

const isoDay = (date: Date): string => date.toISOString().slice(0, 10);

export function toGenerateReportFormValues(template: ReportTemplate): GenerateReportFormValues {
  const today = new Date();
  return {
    name: template.name,
    periodFrom: isoDay(new Date(today.getTime() - 29 * 86_400_000)),
    periodTo: isoDay(today),
    projectIds: [],
    format: 'PDF',
    includeAiSummary: false,
  };
}

export function toGenerateReportInput(template: ReportTemplate, values: GenerateReportFormValues): GenerateReportInput {
  return { type: template.id, ...values };
}

const emailList = z.string().trim().refine(
  (value) => value === '' || value.split(/[,\s]+/).filter(Boolean).every((email) => z.string().email().safeParse(email).success),
  'Separate addresses with commas, e.g. pm@company.com, cfo@company.com',
);

export const scheduleSchema = z.object({
  name: z.string().trim().min(1, 'Give the schedule a name').max(150),
  frequency: z.enum(FREQUENCIES),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time like 09:00'),
  timezone: z.string().min(1),
  projects: z.array(z.string()).max(50, 'Choose at most 50 projects'),
  recipients: z.array(z.string()),
  emails: emailList,
  outputFormat: z.enum(FORMATS),
  includeAiSummary: z.boolean(),
}).refine((values) => values.recipients.length > 0 || values.emails.trim() !== '', {
  path: ['recipients'],
  message: 'Choose at least one role or add an email address',
});

export type ScheduleFormValues = z.infer<typeof scheduleSchema>;

export function toScheduleFormValues(template: ReportTemplate, schedule: ReportSchedule | undefined, defaultTimezone: string): ScheduleFormValues {
  return {
    name: schedule?.name ?? `Weekly ${template.name}`,
    frequency: schedule?.frequency ?? 'WEEKLY',
    time: schedule?.time ?? '09:00',
    timezone: schedule?.timezone ?? defaultTimezone,
    projects: schedule?.projects ?? [],
    recipients: schedule?.recipients ?? ['PROJECT_MANAGER'],
    emails: schedule?.emails.join(', ') ?? '',
    outputFormat: schedule?.outputFormat ?? 'PDF',
    includeAiSummary: schedule?.includeAiSummary ?? false,
  };
}

export function toScheduleInput(values: ScheduleFormValues): ScheduleInput {
  return { ...values, emails: values.emails.split(/[,\s]+/).filter(Boolean) };
}
