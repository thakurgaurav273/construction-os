'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, Skeleton,
} from '@sitepilot/ui';
import { AlertTriangle, Monitor, Smartphone } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useEndOtherSessions, useEndSession, useSessions, type AccountSession } from '@/hooks/api/use-account';
import { getApiErrorMessage } from '@/lib/api/errors';
import { describeDevice } from '../utils/describe-device';

function SessionRow({ session, ending, onEnd }: { session: AccountSession; ending: boolean; onEnd: () => void }): React.ReactElement {
  const device = describeDevice(session.userAgent);
  const DeviceIcon = device.mobile ? Smartphone : Monitor;
  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <DeviceIcon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span className="truncate">{device.label}</span>
            {session.current && <Badge variant="success">This device</Badge>}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {session.ipAddress ? `${session.ipAddress} · ` : ''}
            Signed in {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
            {!session.current && ` · active ${formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })}`}
          </p>
        </div>
      </div>
      {!session.current && (
        <Button variant="outline" size="sm" className="self-start sm:self-auto" disabled={ending} onClick={onEnd}>
          {ending ? 'Signing out…' : 'Sign out'}
        </Button>
      )}
    </li>
  );
}

/** Devices signed in to this account. Ending a session cuts off that device at once. */
export function ActiveSessionsCard(): React.ReactElement {
  const { data: sessions = [], isLoading, isError, refetch } = useSessions();
  const endSession = useEndSession();
  const endOtherSessions = useEndOtherSessions();
  const [confirmOthersOpen, setConfirmOthersOpen] = useState(false);
  const otherSessions = sessions.filter((session) => !session.current);

  async function end(session: AccountSession): Promise<void> {
    try {
      await endSession.mutateAsync(session.id);
      toast.success(`Signed out ${describeDevice(session.userAgent).label}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't sign out that device. Try again."));
      void refetch();
    }
  }

  async function endOthers(): Promise<void> {
    try {
      const { endedSessions } = await endOtherSessions.mutateAsync();
      toast.success(`Signed out ${endedSessions} other ${endedSessions === 1 ? 'device' : 'devices'}`);
      setConfirmOthersOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't sign out your other devices. Try again."));
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>Where you’re signed in. If you don’t recognise a device, sign it out and change your password.</CardDescription>
        </div>
        {otherSessions.length > 0 && (
          <Button variant="outline" onClick={() => setConfirmOthersOpen(true)}>Sign Out Others</Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div>
        ) : isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load your sessions"
            description="Check your connection and try again."
            action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
          />
        ) : (
          <>
            <ul className="divide-y rounded-xl border">
              {sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  ending={endSession.isPending && endSession.variables === session.id}
                  onEnd={() => end(session)}
                />
              ))}
            </ul>
            {otherSessions.length === 0 && (
              <p className="mt-3 text-sm text-muted-foreground">You’re not signed in anywhere else.</p>
            )}
          </>
        )}
      </CardContent>

      <Dialog open={confirmOthersOpen} onOpenChange={setConfirmOthersOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Sign out other devices?</DialogTitle>
            <DialogDescription>
              {otherSessions.length} other {otherSessions.length === 1 ? 'device' : 'devices'} will need to sign in again. You stay signed in here.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOthersOpen(false)}>Cancel</Button>
            <Button onClick={endOthers} disabled={endOtherSessions.isPending}>
              {endOtherSessions.isPending ? 'Signing out…' : 'Sign Out Others'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
