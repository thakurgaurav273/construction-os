import React from 'react';
import { Badge, type BadgeProps } from '@sitepilot/ui';
import { ArrowDownLeft, ArrowUpRight, Ban, CheckCircle2, Clock, FileEdit, RotateCcw } from 'lucide-react';
import { BILL_STATUS_LABELS, DIRECTION_LABELS } from '../constants';
import type { ContractDirection, RaBillStatus } from '../types';

const STATUS_META: Record<RaBillStatus, { variant: NonNullable<BadgeProps['variant']>; icon: React.ComponentType<{ className?: string }> }> = {
  DRAFT: { variant: 'secondary', icon: FileEdit },
  SUBMITTED: { variant: 'warning', icon: Clock },
  CHANGES_REQUESTED: { variant: 'info', icon: RotateCcw },
  CERTIFIED: { variant: 'success', icon: CheckCircle2 },
  CANCELLED: { variant: 'outline', icon: Ban },
};

export function BillStatusBadge({ status }: { status: RaBillStatus }): React.ReactElement {
  const { variant, icon: Icon } = STATUS_META[status];
  return (
    <Badge variant={variant} className="gap-1 whitespace-nowrap">
      <Icon className="h-3 w-3" /> {BILL_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Money in (client contract) or money out (subcontract), at a glance. */
export function DirectionBadge({ direction }: { direction: ContractDirection }): React.ReactElement {
  const Icon = direction === 'CLIENT' ? ArrowDownLeft : ArrowUpRight;
  return (
    <Badge variant={direction === 'CLIENT' ? 'info' : 'outline'} className="gap-1 whitespace-nowrap">
      <Icon className="h-3 w-3" /> {DIRECTION_LABELS[direction].short}
    </Badge>
  );
}
