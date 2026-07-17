'use client';

import React from 'react';
import { Badge, cn } from '@sitepilot/ui';
import type { InventoryStatus } from '@/hooks/api/use-inventory';
import { getStatusMeta } from './inventory-format';

interface InventoryStatusBadgeProps {
  status: InventoryStatus;
  className?: string;
}

export function InventoryStatusBadge({ status, className }: InventoryStatusBadgeProps): React.ReactElement {
  const meta = getStatusMeta(status);
  return (
    <Badge variant="outline" className={cn('font-medium', meta.badgeClass, className)}>
      {meta.label}
    </Badge>
  );
}
