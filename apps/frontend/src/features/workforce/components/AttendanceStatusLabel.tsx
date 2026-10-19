import { cn } from '@sitepilot/ui';
import type { AttendanceStatus } from '@/hooks/api/use-workforce';
import { ATTENDANCE_STATUS_STYLES } from '../constants';
import { toDisplayStatus } from '../utils/attendance';

export function AttendanceStatusLabel({ status, className }: { status: AttendanceStatus | null; className?: string }) {
  const style = ATTENDANCE_STATUS_STYLES[toDisplayStatus(status)];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs whitespace-nowrap', className)}>
      <span className={cn('h-2 w-2 rounded-full shrink-0', style.dot)} aria-hidden="true" />
      {style.label}
    </span>
  );
}
