'use client';

import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { Permission } from '@sitepilot/types';
import {
  Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Skeleton,
} from '@sitepilot/ui';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCurrentAccess } from '@/hooks/api/use-access';
import { useMemberPermissions, useRoleCatalogue, useUpdateMemberPermissions, type Member } from '@/hooks/api/use-settings';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatRole } from '../constants';
import { PermissionChecklist } from './PermissionChecklist';

interface MemberPermissionsDialogProps {
  /** The member being edited; null closes the dialog. */
  member: Member | null;
  onClose: () => void;
}

/** Adds or takes away permissions for one person on top of their role. Their role stays as it is. */
export function MemberPermissionsDialog({ member, onClose }: MemberPermissionsDialogProps): React.ReactElement {
  const { data: catalogue } = useRoleCatalogue();
  const { data: access } = useCurrentAccess();
  const { data: current, isLoading, isError, refetch } = useMemberPermissions(member?.id ?? null);
  const updateMember = useUpdateMemberPermissions();
  const [draft, setDraft] = useState<Set<Permission> | null>(null);

  const saved = useMemo(() => new Set(current?.permissions ?? []), [current]);
  const rolePermissions = useMemo(() => new Set(current?.rolePermissions ?? []), [current]);
  const selected = draft ?? saved;
  const locked = useMemo(() => {
    const held = new Set(access?.permissions ?? []);
    return new Set((catalogue?.permissions ?? []).map((permission) => permission.key).filter((key) => !held.has(key) && !saved.has(key)));
  }, [access, catalogue, saved]);
  const dirty = draft !== null && (draft.size !== saved.size || [...draft].some((permission) => !saved.has(permission)));
  const customized = selected.size !== rolePermissions.size || [...selected].some((permission) => !rolePermissions.has(permission));
  const name = member?.name || member?.email || 'this member';

  function close(): void {
    setDraft(null);
    onClose();
  }

  function toggle(permission: Permission, checked: boolean): void {
    const next = new Set(selected);
    if (checked) next.add(permission);
    else next.delete(permission);
    setDraft(next);
  }

  async function save(): Promise<void> {
    if (!member || !draft) return;
    try {
      await updateMember.mutateAsync({ userId: member.id, permissions: [...draft] });
      toast.success(`Access updated for ${name}`);
      close();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t update their access. Try again.'));
    }
  }

  return (
    <Dialog open={member !== null} onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Permissions for {name}</DialogTitle>
          <DialogDescription>
            {current ? `Starts from their role, ${formatRole(current.role)}. ` : ''}
            Anything you add or remove applies to them alone and stays when their role’s permissions change.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !catalogue ? (
          <div className="space-y-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-6 w-full" />)}</div>
        ) : isError || !current ? (
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load their permissions"
            description="Check your connection and try again."
            action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
          />
        ) : (
          <PermissionChecklist catalogue={catalogue.permissions} selected={selected} baseline={rolePermissions} onToggle={toggle} locked={locked} />
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          {customized ? (
            <Button type="button" variant="ghost" onClick={() => setDraft(new Set(rolePermissions))}>Reset to role</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={close}>Cancel</Button>
            <Button type="button" disabled={!dirty || updateMember.isPending} onClick={() => { void save(); }}>
              {updateMember.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
