'use client';

import React from 'react';
import { Badge, cn } from '@sitepilot/ui';
import type { MaterialStatus } from '@/hooks/api/use-materials';
import { getStatusMeta } from './materials-format';

interface MaterialStatusBadgeProps {
  status: MaterialStatus;
  className?: string;
}

export function MaterialStatusBadge({ status, className }: MaterialStatusBadgeProps): React.ReactElement {
  const meta = getStatusMeta(status);
  return (
    <Badge variant="outline" className={cn('font-medium', meta.badgeClass, className)}>
      {meta.label}
    </Badge>
  );
}
