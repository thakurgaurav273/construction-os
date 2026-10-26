'use client';

import React from 'react';
import { Button, cn } from '@sitepilot/ui';
import { Check, Trash2 } from 'lucide-react';
import type { Notification } from '@/hooks/api/use-notifications';
import { NotificationSummary } from './NotificationSummary';

interface NotificationHistoryRowProps {
  notification: Notification;
  onOpen: (notification: Notification) => void;
  onMarkRead: (notification: Notification) => void;
  onDelete: (notification: Notification) => void;
}

/** One row of the history page: opening it follows its link; read and delete stay one click away. */
export function NotificationHistoryRow({ notification, onOpen, onMarkRead, onDelete }: NotificationHistoryRowProps): React.ReactElement {
  return (
    <li className={cn('group flex items-start gap-2 px-2 py-1 sm:px-3', !notification.read && 'bg-muted/30')}>
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className="flex min-w-0 flex-1 items-start gap-3 rounded-md p-2 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <NotificationSummary notification={notification} clampMessage={false} />
      </button>
      <div className="flex shrink-0 items-center gap-1 pt-2">
        {!notification.read && (
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Mark “${notification.title}” as read`} onClick={() => onMarkRead(notification)}>
            <Check className="h-4 w-4" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label={`Delete “${notification.title}”`}
          onClick={() => onDelete(notification)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
