'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton,
} from '@sitepilot/ui';
import { AlertTriangle, Mail, Trash2, Users } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useChangeMemberRole, useMembers, useRemoveMember, type Member } from '@/hooks/api/use-settings';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';
import { formatRole, type OrgRole } from '../constants';

interface MembersCardProps {
  canManage: boolean;
  /** The signed-in member's role; only owners can manage other owners. */
  currentRole: string | undefined;
  assignableRoles: readonly OrgRole[];
  onInvite: () => void;
}

type PendingChange = { kind: 'role'; member: Member; role: string } | { kind: 'remove'; member: Member };

function lastActiveLabel(member: Member): string {
  return member.lastActive ? `Active ${formatDistanceToNow(new Date(member.lastActive), { addSuffix: true })}` : 'Not signed in yet';
}

export function MembersCard({ canManage, currentRole, assignableRoles, onInvite }: MembersCardProps): React.ReactElement {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { data: members = [], isLoading, isError, refetch } = useMembers();
  const changeRole = useChangeMemberRole();
  const removeMember = useRemoveMember();
  const [pending, setPending] = useState<PendingChange | null>(null);

  const canEdit = (member: Member): boolean =>
    canManage && member.id !== currentUserId && (member.role !== 'OWNER' || currentRole === 'OWNER');

  async function confirmPending(): Promise<void> {
    if (!pending) return;
    try {
      if (pending.kind === 'role') {
        await changeRole.mutateAsync({ memberId: pending.member.id, role: pending.role });
        toast.success(`${pending.member.name} is now ${formatRole(pending.role)}`);
      } else {
        await removeMember.mutateAsync(pending.member.id);
        toast.success(`${pending.member.name} was removed from the workspace`);
      }
      setPending(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, pending.kind === 'role' ? "Couldn't change the role. Try again." : "Couldn't remove the member. Try again."));
    }
  }

  const isConfirming = changeRole.isPending || removeMember.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Members</CardTitle>
          <CardDescription>People who can sign in to this workspace.</CardDescription>
        </div>
        {canManage && <Button onClick={onInvite}><Mail className="mr-2 h-4 w-4" /> Invite Member</Button>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div>
        ) : isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load members"
            description="Check your connection and try again."
            action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
          />
        ) : members.length === 0 ? (
          <EmptyState icon={Users} title="No members yet" description="Invite your team so they can work on projects with you." />
        ) : (
          <ul className="divide-y rounded-xl border">
            {members.map((member) => (
              <li key={member.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(member.name || member.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {member.name || member.email}
                      {member.id === currentUserId && <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{member.email} · {lastActiveLabel(member)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pl-12 sm:pl-0">
                  {member.status !== 'ACTIVE' && <Badge variant="secondary">{formatRole(member.status)}</Badge>}
                  {canEdit(member) ? (
                    <>
                      <Select value={member.role} onValueChange={(role) => { if (role && role !== member.role) setPending({ kind: 'role', member, role }); }}>
                        <SelectTrigger className="w-44" aria-label={`Role for ${member.name || member.email}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {assignableRoles.map((role) => <SelectItem key={role} value={role}>{formatRole(role)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        aria-label={`Remove ${member.name || member.email}`}
                        onClick={() => setPending({ kind: 'remove', member })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <Badge variant="outline">{formatRole(member.role)}</Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{pending?.kind === 'remove' ? 'Remove member?' : 'Change role?'}</DialogTitle>
            <DialogDescription>
              {pending?.kind === 'remove'
                ? `${pending.member.name} will lose access to this workspace straight away. Their past work stays in the records.`
                : pending && `${pending.member.name} will become ${formatRole(pending.role)}. Their access changes straight away.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>Cancel</Button>
            <Button variant={pending?.kind === 'remove' ? 'destructive' : 'default'} onClick={confirmPending} disabled={isConfirming}>
              {isConfirming ? 'Saving…' : pending?.kind === 'remove' ? 'Remove' : 'Change Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
