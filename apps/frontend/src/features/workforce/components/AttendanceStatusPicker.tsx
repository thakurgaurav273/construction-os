'use client';

import { cn } from '@sitepilot/ui';
import type { AttendanceStatus } from '@/hooks/api/use-workforce';
import { ATTENDANCE_STATUS_ORDER, ATTENDANCE_STATUS_STYLES } from '../constants';

interface AttendanceStatusPickerProps {
  workerName: string;
  value: AttendanceStatus | '';
  onChange: (status: AttendanceStatus | '') => void;
}

/** Segmented control; selecting the active status again clears it (leaves the worker unmarked). */
export function AttendanceStatusPicker({ workerName, value, onChange }: AttendanceStatusPickerProps) {
  return (
    <div role="group" aria-label={`Attendance for ${workerName}`} className="inline-flex rounded-lg border bg-muted/30 p-0.5">
      {ATTENDANCE_STATUS_ORDER.map((status) => {
        const style = ATTENDANCE_STATUS_STYLES[status];
        const isSelected = value === status;
        return (
          <button
            key={status}
            type="button"
            title={style.label}
            aria-label={style.label}
            aria-pressed={isSelected}
            onClick={() => onChange(isSelected ? '' : status)}
            className={cn(
              'h-7 min-w-[2.25rem] px-2 rounded-md text-xs font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isSelected ? style.tile : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {style.short}
          </button>
        );
      })}
    </div>
  );
}
