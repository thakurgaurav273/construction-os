'use client';

import React from 'react';
import { Badge } from '@sitepilot/ui';
import type { BadgeProps } from '@sitepilot/ui';
import {
  AlertTriangle, Ban, CheckCircle2, CircleDollarSign, Clock, FileEdit, Link2Off, ShieldCheck, XCircle, Wallet,
} from 'lucide-react';
import type { InvoiceStatus, MatchStatus, PaymentStatus } from '../types';

type Variant = NonNullable<BadgeProps['variant']>;

interface StatusMeta {
  label: string;
  variant: Variant;
  icon: React.ComponentType<{ className?: string }>;
}

const INVOICE_META: Record<InvoiceStatus | 'OVERDUE', StatusMeta> = {
  DRAFT: { label: 'Draft', variant: 'secondary', icon: FileEdit },
  PENDING_APPROVAL: { label: 'Awaiting approval', variant: 'warning', icon: Clock },
  APPROVED: { label: 'Approved', variant: 'info', icon: CheckCircle2 },
  PARTIALLY_PAID: { label: 'Part paid', variant: 'info', icon: Wallet },
  PAID: { label: 'Paid', variant: 'success', icon: CircleDollarSign },
  REJECTED: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  CANCELLED: { label: 'Cancelled', variant: 'outline', icon: Ban },
  OVERDUE: { label: 'Overdue', variant: 'destructive', icon: AlertTriangle },
};

const PAYMENT_META: Record<PaymentStatus, StatusMeta> = {
  PENDING: { label: 'Awaiting approval', variant: 'warning', icon: Clock },
  APPROVED: { label: 'Ready to pay', variant: 'info', icon: CheckCircle2 },
  PAID: { label: 'Paid', variant: 'success', icon: CircleDollarSign },
  REJECTED: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  CANCELLED: { label: 'Cancelled', variant: 'outline', icon: Ban },
};

const MATCH_META: Record<MatchStatus, StatusMeta> = {
  MATCHED: { label: '3-way matched', variant: 'success', icon: ShieldCheck },
  VARIANCE: { label: 'Variance', variant: 'warning', icon: AlertTriangle },
  NO_PO: { label: 'No PO', variant: 'outline', icon: Link2Off },
};

type FinanceStatusBadgeProps = { showIcon?: boolean; className?: string } & (
  | { kind: 'invoice'; value: InvoiceStatus | 'OVERDUE' }
  | { kind: 'payment'; value: PaymentStatus }
  | { kind: 'match'; value: MatchStatus }
);

function resolveMeta(props: FinanceStatusBadgeProps): StatusMeta {
  switch (props.kind) {
    case 'invoice': return INVOICE_META[props.value];
    case 'payment': return PAYMENT_META[props.value];
    case 'match': return MATCH_META[props.value];
  }
}

export function FinanceStatusBadge(props: FinanceStatusBadgeProps): React.ReactElement {
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
