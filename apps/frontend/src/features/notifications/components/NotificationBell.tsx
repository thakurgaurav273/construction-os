'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Badge, Button, ScrollArea, Skeleton, cn,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@sitepilot/ui';
import { Bell, Check, History, Settings2 } from 'lucide-react';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, type Notification } from '@/hooks/api/use-notifications';
import { useNotificationSocket } from '../hooks/use-notification-socket';
import { NotificationSummary } from './NotificationSummary';

function NotificationRow({ notification, onOpen }: { notification: Notification; onOpen: (notification: Notification) => void }): React.ReactElement {
  return (
    <DropdownMenuItem
      onSelect={() => onOpen(notification)}
      className={cn('flex cursor-pointer items-start gap-3 rounded-none p-4 focus:bg-muted/50', !notification.read && 'bg-muted/30')}
    >
      <NotificationSummary notification={notification} />
    </DropdownMenuItem>
  );
}

/** Header bell: unread count, the latest notifications, and live updates while the app is open. */
export function NotificationBell(): React.ReactElement {
  useNotificationSocket();
  const router = useRouter();
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const [open, setOpen] = useState(false);
  const notifications = data?.items ?? [];
  const unread = data?.unread ?? 0;

  /** The footer buttons aren't menu items, so they close the menu themselves. */
  function goTo(path: string): void {
    setOpen(false);
    router.push(path);
  }

  function openNotification(notification: Notification): void {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.link) router.push(notification.link);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:text-foreground" aria-label={`Notifications, ${unread} unread`}>
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 sm:w-96" alignOffset={-10}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">Notifications</DropdownMenuLabel>
          {unread > 0 && <Badge variant="secondary" className="text-xs">{unread} unread</Badge>}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="mx-auto mb-3 h-8 w-8 opacity-20" />
              <p className="text-sm font-medium">You&apos;re all caught up</p>
              <p className="text-xs">Approvals waiting for you and updates on your requests will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col py-1">
              {notifications.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} onOpen={openNotification} />
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="flex items-center gap-1 border-t p-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs"
            disabled={unread === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            <Check className="mr-2 h-3.5 w-3.5" /> Mark all as read
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => goTo('/dashboard/notifications')}>
            <History className="mr-2 h-3.5 w-3.5" /> View all
          </Button>
          <Button variant="ghost" size="sm" className="text-xs" aria-label="Notification preferences" onClick={() => goTo('/dashboard/settings#notifications')}>
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
