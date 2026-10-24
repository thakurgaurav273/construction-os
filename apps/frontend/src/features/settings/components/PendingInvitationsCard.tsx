'use client';

import React from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCancelInvitation, useInvitations, useResendInvitation, type Invitation } from '@/hooks/api/use-settings';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formatRole } from '../constants';

/** Shown only to people who manage members; the API refuses everyone else. */
export function PendingInvitationsCard(): React.ReactElement {
  const { data: invitations = [], isLoading, isError, refetch } = useInvitations();
  const resendInvitation = useResendInvitation();
  const cancelInvitation = useCancelInvitation();

  async function resend(invitation: Invitation): Promise<void> {
    try {
      await resendInvitation.mutateAsync(invitation.id);
      toast.success(`Sent a new link to ${invitation.email}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't resend the invitation. Try again."));
    }
  }

  async function cancel(invitation: Invitation): Promise<void> {
    try {
      await cancelInvitation.mutateAsync(invitation.id);
      toast.success(`Cancelled the invitation for ${invitation.email}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't cancel the invitation. Try again."));
    }
  }

  const busyId = (resendInvitation.isPending && resendInvitation.variables) || (cancelInvitation.isPending && cancelInvitation.variables);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>Invitations that haven’t been accepted yet. Resending sends a fresh 7-day link and stops the old one working.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
        ) : isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load invitations"
            description="Check your connection and try again."
            action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
          />
        ) : invitations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No pending invitations. Everyone you invited has joined.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {formatDistanceToNow(new Date(invitation.expiresAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{formatRole(invitation.role)}</Badge>
                  <Button variant="ghost" size="sm" disabled={busyId === invitation.id} onClick={() => resend(invitation)}>Resend</Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={busyId === invitation.id}
                    onClick={() => cancel(invitation)}
                  >
                    Cancel
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
