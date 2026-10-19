'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { Activity, Clock, LogIn, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Progress, Skeleton } from '@sitepilot/ui';
import { useShiftEvent, useWorker, type Worker } from '@/hooks/api/use-workforce';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ATTENDANCE_STATUS_STYLES } from '@/features/workforce/constants';
import { AttendanceStatusLabel } from '@/features/workforce/components/AttendanceStatusLabel';
import { attendanceRateTone, formatCheckIn, toDisplayStatus } from '@/features/workforce/utils/attendance';

function formatTime(timestamp: string | null): string {
  return timestamp ? format(new Date(timestamp), 'h:mm a') : '—';
}

export function WorkerAttendanceCard({ worker }: { worker: Worker }): React.ReactElement {
  const { data: detail, isLoading, isError, refetch } = useWorker(worker.id);
  const shiftEvent = useShiftEvent(worker.projectId ?? '');

  const today = detail?.recentAttendance.find((record) => record.date === detail.week[detail.week.length - 1]?.date);
  const canCheckIn = worker.isActive && !!worker.projectId && !today?.checkInAt
    && worker.todayStatus !== 'ABSENT' && worker.todayStatus !== 'ON_LEAVE';
  const canCheckOut = worker.isActive && !!today?.checkInAt && !today.checkOutAt;

  async function recordShiftEvent(event: 'check-in' | 'check-out'): Promise<void> {
    try {
      const record = await shiftEvent.mutateAsync({ workerId: worker.id, event });
      const label = event === 'check-in' ? `checked in (${ATTENDANCE_STATUS_STYLES[record.status].label})` : 'checked out';
      toast.success(`${worker.name} ${label}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, `Couldn't record ${event}. Try again.`));
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Attendance
        </h4>
        <AttendanceStatusLabel status={worker.todayStatus} className="font-semibold" />
      </div>

      {isLoading && <Skeleton className="h-24 w-full" />}
      {isError && (
        <div className="text-center space-y-2 py-2">
          <p className="text-xs text-muted-foreground">Unable to load attendance history.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {detail && (
        <>
          <div className="flex gap-1.5" aria-label="Last 7 days">
            {detail.week.map((day) => {
              const style = ATTENDANCE_STATUS_STYLES[toDisplayStatus(day.status)];
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5" title={`${day.date}: ${style.label}`}>
                  <div className={`w-full h-10 rounded-lg flex items-center justify-center text-xs font-bold ${style.tile}`}>
                    {style.short}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">{format(parseISO(day.date), 'EEE')}</span>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Attendance, last 30 days</span>
              <span className={`font-bold ${attendanceRateTone(worker.attendanceRate)}`}>
                {worker.attendanceRate === null ? 'No records' : `${worker.attendanceRate}%`}
              </span>
            </div>
            <Progress value={worker.attendanceRate ?? 0} className="h-2 rounded-full" />
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Last check-in: {formatCheckIn(worker.lastCheckInAt)}
            </p>
          </div>

          {(canCheckIn || canCheckOut) && (
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" disabled={!canCheckIn || shiftEvent.isPending} onClick={() => recordShiftEvent('check-in')}>
                <LogIn className="h-3.5 w-3.5" /> Check in now
              </Button>
              <Button size="sm" variant="outline" disabled={!canCheckOut || shiftEvent.isPending} onClick={() => recordShiftEvent('check-out')}>
                <LogOut className="h-3.5 w-3.5" /> Check out now
              </Button>
            </div>
          )}

          {detail.recentAttendance.length > 0 && (
            <ul className="divide-y rounded-lg border text-xs">
              {detail.recentAttendance.slice(0, 7).map((record) => (
                <li key={record.date} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-24 shrink-0 font-medium whitespace-nowrap">{format(parseISO(record.date), 'EEE, d MMM')}</span>
                  <AttendanceStatusLabel status={record.status} className="w-20 shrink-0" />
                  <span className="flex-1 text-muted-foreground truncate">
                    {record.checkInAt ? `${formatTime(record.checkInAt)} – ${formatTime(record.checkOutAt)}` : record.project.name}
                  </span>
                  {record.hoursWorked !== null && <span className="text-muted-foreground">{record.hoursWorked}h</span>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
