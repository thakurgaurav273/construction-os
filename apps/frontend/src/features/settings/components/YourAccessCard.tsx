'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { useCurrentAccess } from '@/hooks/api/use-access';
import { useRoleCatalogue } from '@/hooks/api/use-settings';
import { ORG_ROLES, ROLE_SUMMARIES, formatRole } from '../constants';
import { PermissionChecklist } from './PermissionChecklist';

/**
 * For members who don't manage the team: what they themselves can do, with anything set for them alone
 * marked against their role. Other roles' permissions are left to admins.
 */
export function YourAccessCard(): React.ReactElement {
  const { data: access } = useCurrentAccess();
  const { data: catalogue, isLoading } = useRoleCatalogue();
  const role = ORG_ROLES.find((candidate) => candidate === access?.role);
  const selected = useMemo(() => new Set(access?.permissions ?? []), [access]);
  const rolePermissions = useMemo(
    () => new Set(catalogue?.roles.find((entry) => entry.role === role)?.permissions ?? access?.permissions ?? []),
    [catalogue, role, access],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your access</CardTitle>
        <CardDescription>What you can do in this workspace. Ask an admin if your work needs more.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading || !catalogue || !role ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-6 w-full" />)}</div>
        ) : (
          <>
            <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium">{formatRole(role)}</p>
              <p className="text-muted-foreground">{ROLE_SUMMARIES[role]}</p>
              <p className="mt-1 text-xs text-muted-foreground">{selected.size} of {catalogue.permissions.length} permissions</p>
            </div>
            <PermissionChecklist catalogue={catalogue.permissions} selected={selected} baseline={rolePermissions} />
          </>
        )}
      </CardContent>
    </Card>
  );
}
