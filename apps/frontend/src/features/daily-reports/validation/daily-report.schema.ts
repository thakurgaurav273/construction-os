import { format } from 'date-fns';
import { z } from 'zod';
import type { DailyReportDetail, DailyReportInput } from '@/hooks/api/use-daily-reports';
import { MAX_LINE_ITEMS } from '../constants';

const MAX_TEXT_LENGTH = 5000;

function todayIsoDate(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

const headcount = (label: string) =>
  z.coerce
    .number({ invalid_type_error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(0, `${label} can't be negative`);

export const dailyReportSchema = z.object({
  date: z
    .string()
    .min(1, 'Select the report date')
    .refine((value) => value <= todayIsoDate(), "Reports can't be dated in the future"),
  weather: z.string().trim().max(120, 'Keep weather under 120 characters'),
  overallProgress: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || (/^\d+$/.test(value) && Number(value) <= 100),
      'Enter a whole number from 0 to 100',
    ),
  workCompleted: z.string().trim().max(MAX_TEXT_LENGTH, 'Keep this under 5,000 characters'),
  remarks: z.string().trim().max(MAX_TEXT_LENGTH, 'Keep this under 5,000 characters'),
  labour: z.object({
    skilled: headcount('Skilled'),
    unskilled: headcount('Unskilled'),
    supervisors: headcount('Supervisors'),
  }),
  materials: z
    .array(
      z.object({
        material: z.string().trim().min(1, 'Enter the material').max(120),
        quantity: z.coerce.number({ invalid_type_error: 'Enter a quantity' }).positive('Enter a quantity'),
        unit: z.string().trim().min(1, 'Enter a unit').max(20),
      }),
    )
    .max(MAX_LINE_ITEMS),
  equipment: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Enter the equipment').max(120),
        hours: z.coerce
          .number({ invalid_type_error: 'Enter hours' })
          .min(0, "Hours can't be negative")
          .max(24, 'Max 24 hours a day'),
      }),
    )
    .max(MAX_LINE_ITEMS),
  issues: z
    .array(
      z.object({
        severity: z.enum(['minor', 'medium', 'high']),
        description: z.string().trim().min(1, 'Describe the issue').max(500),
      }),
    )
    .max(MAX_LINE_ITEMS),
});

export type DailyReportFormValues = z.infer<typeof dailyReportSchema>;

export function emptyDailyReportValues(): DailyReportFormValues {
  return {
    date: todayIsoDate(),
    weather: '',
    overallProgress: '',
    workCompleted: '',
    remarks: '',
    labour: { skilled: 0, unskilled: 0, supervisors: 0 },
    materials: [],
    equipment: [],
    issues: [],
  };
}

export function toDailyReportFormValues(report: DailyReportDetail): DailyReportFormValues {
  return {
    date: report.date.slice(0, 10),
    weather: report.weather ?? '',
    overallProgress: report.overallProgress === null ? '' : String(report.overallProgress),
    workCompleted: report.workCompleted ?? '',
    remarks: report.remarks ?? '',
    labour: report.labourDetails ?? { skilled: 0, unskilled: 0, supervisors: 0 },
    materials: report.materialsConsumed,
    equipment: report.equipmentUsed,
    issues: report.issues,
  };
}

export function toDailyReportInput(values: DailyReportFormValues): DailyReportInput {
  return {
    date: values.date,
    weather: values.weather,
    overallProgress: values.overallProgress === '' ? null : Number(values.overallProgress),
    workCompleted: values.workCompleted,
    remarks: values.remarks,
    labourDetails: values.labour,
    materialsConsumed: values.materials,
    equipmentUsed: values.equipment,
    issues: values.issues,
  };
}
