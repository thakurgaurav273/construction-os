'use client';

import React, { useMemo, useState } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton, cn } from '@sitepilot/ui';
import { AlertTriangle, Check, Minus } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useRoleCatalogue, type RoleCatalogue } from '@/hooks/api/use-settings';
import { ORG_ROLES, ROLE_SUMMARIES, formatRole, type OrgRole } from '../constants';

type PermissionGroup = { name: string; permissions: RoleCatalogue['permissions'] };

function groupPermissions(permissions: RoleCatalogue['permissions']): PermissionGroup[] {
  const groups = new Map<string, PermissionGroup>();
  for (const permission of permissions) {
    const group = groups.get(permission.group) ?? { name: permission.group, permissions: [] };
    group.permissions.push(permission);
    groups.set(permission.group, group);
  }
  return [...groups.values()];
}

/**
 * Read-only view of what each role can do. Roles are fixed collections of permissions defined by the
 * product; members get access by being given a role.
 */
export function RolesPermissionsCard({ currentRole }: { currentRole: string | undefined }): React.ReactElement {
  const { data: catalogue, isLoading, isError, refetch } = useRoleCatalogue();
  // Start on the viewer's own role, which may arrive after the first render.
  const [chosenRole, setSelectedRole] = useState<OrgRole | null>(null);
  const selectedRole = chosenRole ?? ORG_ROLES.find((role) => role === currentRole) ?? 'PROJECT_MANAGER';

  const groups = useMemo(() => groupPermissions(catalogue?.permissions ?? []), [catalogue]);
  const granted = useMemo(
    () => new Set(catalogue?.roles.find((entry) => entry.role === selectedRole)?.permissions ?? []),
    [catalogue, selectedRole],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles & Permissions</CardTitle>
        <CardDescription>What each role can do. Viewing project data needs no permission; every change and all financial data does.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading ? (
          <div className="space-y-3"><Skeleton className="h-9 w-full" />{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-8 w-full" />)}</div>
        ) : isError || !catalogue ? (
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load roles"
            description="Check your connection and try again."
            action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Role">
              {ORG_ROLES.map((role) => (
                <Button
                  key={role}
                  type="button"
                  size="sm"
                  variant={role === selectedRole ? 'default' : 'outline'}
                  aria-pressed={role === selectedRole}
                  onClick={() => setSelectedRole(role)}
                >
                  {formatRole(role)}
                  {role === currentRole && <span className="text-[10px] opacity-70">(you)</span>}
                </Button>
              ))}
            </div>

            <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm">
              <p className="font-medium">{formatRole(selectedRole)}</p>
              <p className="text-muted-foreground">{ROLE_SUMMARIES[selectedRole]}</p>
              <p className="mt-1 text-xs text-muted-foreground">{granted.size} of {catalogue.permissions.length} permissions</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {groups.map((group) => (
                <section key={group.name} aria-labelledby={`permission-group-${group.name}`}>
                  <h4 id={`permission-group-${group.name}`} className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.name}</h4>
                  <ul className="space-y-1.5">
                    {group.permissions.map((permission) => {
                      const allowed = granted.has(permission.key);
                      return (
                        <li key={permission.key} className={cn('flex items-start gap-2 text-sm', !allowed && 'text-muted-foreground')}>
                          {allowed
                            ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Allowed" />
                            : <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-label="Not allowed" />}
                          <span>{permission.label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
