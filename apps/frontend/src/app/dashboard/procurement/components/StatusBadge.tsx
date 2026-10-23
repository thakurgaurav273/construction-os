'use client';

import React from 'react';
import { Badge } from '@sitepilot/ui';
import type { BadgeProps } from '@sitepilot/ui';
import {
  CheckCircle2, Clock, XCircle, RotateCcw, FileEdit, Ban,
  Truck, PackageCheck, AlertTriangle, Circle, CalendarClock, PackageOpen,
  DoorOpen, Scale, Award, Flame, ArrowUp, Minus, PauseCircle,
} from 'lucide-react';
import type {
  DeliveryStatus, PoDeliveryStatus, ProcurementPriority, PurchaseOrderStatus, RfqStatus, VendorStatus,
} from '@/features/procurement/types';

type Variant = NonNullable<BadgeProps['variant']>;

interface StatusMeta {
  label: string;
  variant: Variant;
  icon: React.ComponentType<{ className?: string }>;
}

/** Order-level and shipment-level delivery states share one badge; DELAYED is derived from isDelayed. */
export type DeliveryBadgeValue = PoDeliveryStatus | DeliveryStatus | 'DELAYED';

const APPROVAL_META: Record<PurchaseOrderStatus, StatusMeta> = {
  DRAFT: { label: 'Draft', variant: 'secondary', icon: FileEdit },
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock },
  CHANGES_REQUESTED: { label: 'Changes', variant: 'info', icon: RotateCcw },
  APPROVED: { label: 'Approved', variant: 'success', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  CANCELLED: { label: 'Cancelled', variant: 'outline', icon: Ban },
};

const DELIVERY_META: Record<DeliveryBadgeValue, StatusMeta> = {
  NOT_STARTED: { label: 'Not Started', variant: 'outline', icon: Circle },
  SCHEDULED: { label: 'Scheduled', variant: 'warning', icon: CalendarClock },
  IN_TRANSIT: { label: 'In Transit', variant: 'info', icon: Truck },
  PARTIAL: { label: 'Partial', variant: 'info', icon: PackageOpen },
  DELIVERED: { label: 'Delivered', variant: 'success', icon: PackageCheck },
  RECEIVED: { label: 'Received', variant: 'success', icon: PackageCheck },
  CANCELLED: { label: 'Cancelled', variant: 'outline', icon: Ban },
  DELAYED: { label: 'Delayed', variant: 'destructive', icon: AlertTriangle },
};

const RFQ_META: Record<RfqStatus, StatusMeta> = {
  OPEN: { label: 'Open', variant: 'info', icon: DoorOpen },
  EVALUATING: { label: 'Evaluating', variant: 'default', icon: Scale },
  AWARDED: { label: 'Awarded', variant: 'success', icon: Award },
  CANCELLED: { label: 'Cancelled', variant: 'outline', icon: Ban },
};

const PRIORITY_META: Record<ProcurementPriority, StatusMeta> = {
  LOW: { label: 'Low', variant: 'secondary', icon: Minus },
  MEDIUM: { label: 'Medium', variant: 'info', icon: ArrowUp },
  HIGH: { label: 'High', variant: 'warning', icon: ArrowUp },
  CRITICAL: { label: 'Critical', variant: 'destructive', icon: Flame },
};

const VENDOR_META: Record<VendorStatus, StatusMeta> = {
  ACTIVE: { label: 'Active', variant: 'success', icon: CheckCircle2 },
  INACTIVE: { label: 'Inactive', variant: 'outline', icon: PauseCircle },
};

type StatusBadgeProps = { showIcon?: boolean; className?: string } & (
  | { kind: 'approval'; value: PurchaseOrderStatus }
  | { kind: 'delivery'; value: DeliveryBadgeValue }
  | { kind: 'rfq'; value: RfqStatus }
  | { kind: 'priority'; value: ProcurementPriority }
  | { kind: 'vendor'; value: VendorStatus }
);

function resolveMeta(props: StatusBadgeProps): StatusMeta {
  switch (props.kind) {
    case 'approval': return APPROVAL_META[props.value];
    case 'delivery': return DELIVERY_META[props.value];
    case 'rfq': return RFQ_META[props.value];
    case 'priority': return PRIORITY_META[props.value];
    case 'vendor': return VENDOR_META[props.value];
  }
}

export function StatusBadge(props: StatusBadgeProps): React.ReactElement {
  const { showIcon = true, className = '' } = props;
  const meta = resolveMeta(props);
  const Icon = meta.icon;
  return (
    <Badge variant={meta.variant} className={`gap-1 font-medium whitespace-nowrap ${className}`}>
      {showIcon && <Icon className="h-3 w-3" />}
      {meta.label}
    </Badge>
  );
}
