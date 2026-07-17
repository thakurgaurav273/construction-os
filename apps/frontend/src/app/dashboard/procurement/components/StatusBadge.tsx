'use client';

import React from 'react';
import { Badge } from '@sitepilot/ui';
import type { BadgeProps } from '@sitepilot/ui';
import {
  CheckCircle2, Clock, XCircle, RotateCcw, FileEdit,
  Truck, PackageCheck, AlertTriangle, Circle,
  DoorOpen, Scale, Award, Flame, ArrowUp, Minus,
} from 'lucide-react';
import type {
  ApprovalStatus, DeliveryStatus, RfqStatus, ProcurementPriority,
} from '@/data/procurement-demo';

type Variant = NonNullable<BadgeProps['variant']>;

interface StatusMeta {
  label: string;
  variant: Variant;
  icon: React.ComponentType<{ className?: string }>;
}

const APPROVAL_META: Record<ApprovalStatus, StatusMeta> = {
  draft: { label: 'Draft', variant: 'secondary', icon: FileEdit },
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  approved: { label: 'Approved', variant: 'success', icon: CheckCircle2 },
  rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  changes_requested: { label: 'Changes', variant: 'info', icon: RotateCcw },
};

const DELIVERY_META: Record<DeliveryStatus, StatusMeta> = {
  not_started: { label: 'Not Started', variant: 'outline', icon: Circle },
  pending: { label: 'Pending', variant: 'warning', icon: Clock },
  in_transit: { label: 'In Transit', variant: 'info', icon: Truck },
  delivered: { label: 'Delivered', variant: 'success', icon: PackageCheck },
  delayed: { label: 'Delayed', variant: 'destructive', icon: AlertTriangle },
};

const RFQ_META: Record<RfqStatus, StatusMeta> = {
  draft: { label: 'Draft', variant: 'secondary', icon: FileEdit },
  open: { label: 'Open', variant: 'info', icon: DoorOpen },
  closing_soon: { label: 'Closing Soon', variant: 'warning', icon: Clock },
  evaluating: { label: 'Evaluating', variant: 'default', icon: Scale },
  awarded: { label: 'Awarded', variant: 'success', icon: Award },
};

const PRIORITY_META: Record<ProcurementPriority, StatusMeta> = {
  low: { label: 'Low', variant: 'secondary', icon: Minus },
  medium: { label: 'Medium', variant: 'info', icon: ArrowUp },
  high: { label: 'High', variant: 'warning', icon: ArrowUp },
  critical: { label: 'Critical', variant: 'destructive', icon: Flame },
};

interface StatusBadgeProps {
  kind: 'approval' | 'delivery' | 'rfq' | 'priority';
  value: ApprovalStatus | DeliveryStatus | RfqStatus | ProcurementPriority;
  showIcon?: boolean;
  className?: string;
}

function resolveMeta(kind: StatusBadgeProps['kind'], value: string): StatusMeta {
  if (kind === 'approval') return APPROVAL_META[value as ApprovalStatus];
  if (kind === 'delivery') return DELIVERY_META[value as DeliveryStatus];
  if (kind === 'rfq') return RFQ_META[value as RfqStatus];
  return PRIORITY_META[value as ProcurementPriority];
}

export function StatusBadge({
  kind,
  value,
  showIcon = true,
  className = '',
}: StatusBadgeProps): React.ReactElement {
  const meta = resolveMeta(kind, value);
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className={`gap-1 font-medium whitespace-nowrap ${className}`}>
      {showIcon && <Icon className="h-3 w-3" />}
      {meta.label}
    </Badge>
  );
}
