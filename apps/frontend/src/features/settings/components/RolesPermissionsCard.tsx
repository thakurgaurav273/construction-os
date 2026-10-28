'use client';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Permission } from '@sitepilot/types';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCurrentAccess } from '@/hooks/api/use-access';
import { useRoleCatalogue, useUpdateRolePermissions } from '@/hooks/api/use-settings';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ORG_ROLES, ROLE_SUMMARIES, formatRole, type OrgRole } from '../constants';
import { PermissionChecklist } from './PermissionChecklist';

/** Who may edit a role here; the API applies the same rules. */
function roleLockReason(role: OrgRole, currentRole: string | undefined, canManageRoles: boolean): string | null {
  if (!canManageRoles) return null;
  if (role === 'OWNER') return 'The owner always has full access.';
  if (role === currentRole) return 'You can’t change your own role’s access. Ask the owner.';
  if (role === 'ADMIN' && currentRole !== 'OWNER') return 'Only the owner can change what admins can do.';
  return null;
}

/**
 * What each role can do in this organization. People who manage roles can change a role's permissions;
 * every member with that role gets the change at once, apart from anything set for them individually.
 */
export function RolesPermissionsCard({ currentRole }: { currentRole: string | undefined }): React.ReactElement {
  const { data: catalogue, isLoading, isError, refetch } = useRoleCatalogue();
  const { data: access } = useCurrentAccess();
  const updateRole = useUpdateRolePermissions();
  const canManageRoles = access?.permissions.includes('roles.manage') ?? false;
  // Start on the viewer's own role, which may arrive after the first render.
  const [chosenRole, setChosenRole] = useState<OrgRole | null>(null);
  const selectedRole = chosenRole ?? ORG_ROLES.find((role) => role === currentRole) ?? 'PROJECT_MANAGER';
  const [draft, setDraft] = useState<Set<Permission> | null>(null);

  const entry = catalogue?.roles.find((candidate) => candidate.role === selectedRole);
  const saved = useMemo(() => new Set(entry?.permissions ?? []), [entry]);
  const defaults = useMemo(() => new Set(entry?.defaults ?? []), [entry]);
  const selected = draft ?? saved;
  const lockReason = roleLockReason(selectedRole, currentRole, canManageRoles);
  const editable = canManageRoles && lockReason === null;
  // Nobody can hand out access they don't hold; taking it away is always allowed.
  const locked = useMemo(() => {
    const held = new Set(access?.permissions ?? []);
    return new Set((catalogue?.permissions ?? []).map((permission) => permission.key).filter((key) => !held.has(key) && !saved.has(key)));
  }, [access, catalogue, saved]);
  const dirty = draft !== null && (draft.size !== saved.size || [...draft].some((permission) => !saved.has(permission)));

  function chooseRole(role: OrgRole): void {
    setChosenRole(role);
    setDraft(null);
  }

  function toggle(permission: Permission, checked: boolean): void {
    const next = new Set(selected);
    if (checked) next.add(permission);
    else next.delete(permission);
    setDraft(next);
  }

  async function save(): Promise<void> {
    if (!draft) return;
    try {
      await updateRole.mutateAsync({ role: selectedRole, permissions: [...draft] });
      toast.success(`${formatRole(selectedRole)} permissions updated for everyone with that role`);
      setDraft(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t update the role. Try again.'));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles & Permissions</CardTitle>
        <CardDescription>
          What each role can do. Each area needs its view permission to appear in the menu; changes and financial data need their own.
          {canManageRoles && ' Changing a role updates everyone with it, except permissions set for a person individually.'}
        </CardDescription>
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
                  onClick={() => chooseRole(role)}
                >
                  {formatRole(role)}
                  {role === currentRole && <span className="text-[10px] opacity-70">(you)</span>}
                </Button>
              ))}
            </div>

            <div className="flex flex-col gap-3 rounded-lg bg-muted/40 px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="flex items-center gap-2 font-medium">
                  {formatRole(selectedRole)}
                  {entry?.customized && <Badge variant="secondary" className="text-[10px]">Customized</Badge>}
                </p>
                <p className="text-muted-foreground">{ROLE_SUMMARIES[selectedRole]}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selected.size} of {catalogue.permissions.length} permissions{lockReason && ` · ${lockReason}`}
                </p>
              </div>
              {editable && (
                <div className="flex shrink-0 gap-2">
                  {(entry?.customized || dirty) && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(new Set(defaults))}>Reset to defaults</Button>
                  )}
                  {dirty && <Button type="button" variant="outline" size="sm" onClick={() => setDraft(null)}>Discard</Button>}
                  <Button type="button" size="sm" disabled={!dirty || updateRole.isPending} onClick={() => { void save(); }}>
                    {updateRole.isPending ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              )}
            </div>

            <PermissionChecklist
              catalogue={catalogue.permissions}
              selected={selected}
              baseline={defaults}
              onToggle={editable ? toggle : undefined}
              locked={locked}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
