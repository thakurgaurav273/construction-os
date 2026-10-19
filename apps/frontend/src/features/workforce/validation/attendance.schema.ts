import { z } from 'zod';
import type { AttendanceRoster, MarkAttendanceInput } from '@/hooks/api/use-workforce';

export const attendanceSheetSchema = z.object({
  entries: z
    .array(
      z.object({
        workerId: z.string(),
        status: z.union([z.enum(['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_LEAVE']), z.literal('')]),
      }),
    )
    .refine((entries) => entries.some((entry) => entry.status !== ''), 'Mark at least one worker before saving.'),
});

export type AttendanceSheetValues = z.infer<typeof attendanceSheetSchema>;

export function toAttendanceSheetValues(roster: AttendanceRoster): AttendanceSheetValues {
  return {
    entries: roster.entries.map((entry) => ({ workerId: entry.worker.id, status: entry.record?.status ?? '' })),
  };
}

/** Unmarked workers are left out so saving never overwrites them with a guess. */
export function toMarkAttendanceInput(date: string, values: AttendanceSheetValues): MarkAttendanceInput {
  const entries: MarkAttendanceInput['entries'] = [];
  for (const entry of values.entries) {
    if (entry.status !== '') entries.push({ workerId: entry.workerId, status: entry.status });
  }
  return { date, entries };
}
