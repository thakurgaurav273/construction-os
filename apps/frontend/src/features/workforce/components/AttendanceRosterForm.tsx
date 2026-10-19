'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@sitepilot/ui';
import { useMarkAttendance, type AttendanceRoster } from '@/hooks/api/use-workforce';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ATTENDANCE_STATUS_ORDER, ATTENDANCE_STATUS_STYLES, SHIFT_LABELS } from '../constants';
import { formatCheckIn } from '../utils/attendance';
import {
  attendanceSheetSchema, toAttendanceSheetValues, toMarkAttendanceInput, type AttendanceSheetValues,
} from '../validation/attendance.schema';
import { AttendanceStatusPicker } from './AttendanceStatusPicker';

interface AttendanceRosterFormProps {
  projectId: string;
  roster: AttendanceRoster;
  onSaved: () => void;
}

export function AttendanceRosterForm({ projectId, roster, onSaved }: AttendanceRosterFormProps) {
  const markAttendance = useMarkAttendance(projectId);
  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<AttendanceSheetValues>({
    resolver: zodResolver(attendanceSheetSchema),
    defaultValues: toAttendanceSheetValues(roster),
  });

  const entries = watch('entries');
  const unmarkedCount = entries.filter((entry) => entry.status === '').length;

  function markRemainingPresent(): void {
    entries.forEach((entry, index) => {
      if (entry.status === '') setValue(`entries.${index}.status`, 'PRESENT', { shouldDirty: true });
    });
  }

  async function onSubmit(values: AttendanceSheetValues): Promise<void> {
    const input = toMarkAttendanceInput(roster.date, values);
    try {
      const saved = await markAttendance.mutateAsync(input);
      const onSite = saved.summary.present + saved.summary.late + saved.summary.halfDay;
      toast.success(`Attendance saved — ${onSite} on site, ${saved.summary.absent} absent`);
      onSaved();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save attendance. Check your connection and try again."));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b text-xs">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {ATTENDANCE_STATUS_ORDER.map((status) => (
            <span key={status} className={ATTENDANCE_STATUS_STYLES[status].text}>
              {ATTENDANCE_STATUS_STYLES[status].short} = {ATTENDANCE_STATUS_STYLES[status].label}
            </span>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={markRemainingPresent} disabled={unmarkedCount === 0}>
          <CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark {unmarkedCount} remaining present
        </Button>
      </div>

      <ul className="flex-1 overflow-y-auto divide-y">
        {roster.entries.map((entry, index) => (
          <li key={entry.worker.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-5 py-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                {entry.worker.initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{entry.worker.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {entry.worker.role} · {entry.worker.trade} · {SHIFT_LABELS[entry.worker.shift]}
                  {entry.record?.checkInAt && ` · In ${formatCheckIn(entry.record.checkInAt)}`}
                </p>
              </div>
            </div>
            <Controller
              control={control}
              name={`entries.${index}.status`}
              render={({ field }) => (
                <AttendanceStatusPicker workerName={entry.worker.name} value={field.value} onChange={field.onChange} />
              )}
            />
          </li>
        ))}
      </ul>

      <div className="border-t px-5 py-4 space-y-2">
        {errors.entries?.root?.message && (
          <p className="text-xs text-destructive" role="alert">{errors.entries.root.message}</p>
        )}
        <Button type="submit" className="w-full" disabled={markAttendance.isPending}>
          {markAttendance.isPending ? 'Saving…' : 'Save Attendance'}
        </Button>
      </div>
    </form>
  );
}
