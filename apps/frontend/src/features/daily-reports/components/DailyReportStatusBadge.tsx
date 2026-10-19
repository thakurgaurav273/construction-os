import { CheckCircle2, Clock, FileEdit, RotateCcw, type LucideIcon } from 'lucide-react';
import { Badge, type BadgeProps } from '@sitepilot/ui';
import type { DailyReportStatus } from '@/hooks/api/use-daily-reports';
import { REPORT_STATUS_OPTIONS } from '../constants';

const STATUS_STYLES: Record<DailyReportStatus, { variant: BadgeProps['variant']; icon: LucideIcon }> = {
  DRAFT: { variant: 'secondary', icon: FileEdit },
  SUBMITTED: { variant: 'info', icon: Clock },
  APPROVED: { variant: 'success', icon: CheckCircle2 },
  REJECTED: { variant: 'warning', icon: RotateCcw },
};

export function DailyReportStatusBadge({ status }: { status: DailyReportStatus }) {
  const { variant, icon: Icon } = STATUS_STYLES[status];
  const label = REPORT_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;

  return (
    <Badge variant={variant} className="gap-1 whitespace-nowrap">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </Badge>
  );
}
