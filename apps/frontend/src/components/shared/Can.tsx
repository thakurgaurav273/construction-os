'use client';

import React from 'react';
import type { Permission } from '@sitepilot/types';
import { useCan } from '@/hooks/api/use-access';

interface CanProps {
  permission: Permission;
  children: React.ReactNode;
  /** Rendered instead when the member lacks the permission. */
  fallback?: React.ReactNode;
}

/** Shows an action only to members whose role grants it. */
export function Can({ permission, children, fallback = null }: CanProps): React.ReactElement {
  const can = useCan();
  return <>{can(permission) ? children : fallback}</>;
}
