'use client';

import React, { useState } from 'react';
import { useCurrentAccess } from '@/hooks/api/use-access';
import { ORG_ROLES } from '../constants';
import { InviteMemberDialog } from './InviteMemberDialog';
import { MembersCard } from './MembersCard';
import { PendingInvitationsCard } from './PendingInvitationsCard';
import { RolesPermissionsCard } from './RolesPermissionsCard';

/** Settings → Members & Roles: the team, open invitations and what each role can do. */
export function MembersTab(): React.ReactElement {
  const { data: access } = useCurrentAccess();
  const canManage = access?.permissions.includes('members.manage') ?? false;
  // Only owners can hand out the Owner role (enforced server-side too).
  const assignableRoles = ORG_ROLES.filter((role) => role !== 'OWNER' || access?.role === 'OWNER');
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="space-y-6">
      <MembersCard canManage={canManage} currentRole={access?.role} assignableRoles={assignableRoles} onInvite={() => setInviteOpen(true)} />
      {canManage && <PendingInvitationsCard />}
      <RolesPermissionsCard currentRole={access?.role} />
      {canManage && <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} assignableRoles={assignableRoles} />}
    </div>
  );
}
