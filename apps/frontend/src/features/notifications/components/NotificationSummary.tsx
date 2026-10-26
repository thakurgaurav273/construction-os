import React from 'react';
import { cn } from '@sitepilot/ui';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Notification, NotificationType } from '@/hooks/api/use-notifications';
import { formatRelativeTime } from '@/lib/utils';

const TYPE_ICONS: Record<NotificationType, { icon: LucideIcon; className: string }> = {
  INFO: { icon: Info, className: 'text-blue-500' },
  SUCCESS: { icon: CheckCircle2, className: 'text-emerald-500' },
  WARNING: { icon: AlertTriangle, className: 'text-amber-500' },
  ERROR: { icon: XCircle, className: 'text-red-500' },
};

/** Icon, title, message and time of one notification, as shown in the bell and on the history page. */
export function NotificationSummary({ notification, clampMessage = true }: { notification: Notification; clampMessage?: boolean }): React.ReactElement {
  const { icon: Icon, className } = TYPE_ICONS[notification.type] ?? TYPE_ICONS.INFO;
  return (
    <>
      <div className="mt-0.5 shrink-0 rounded-full border bg-background p-1.5">
        <Icon className={cn('h-4 w-4', className)} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className={cn('text-sm leading-snug', notification.read ? 'font-medium text-foreground/80' : 'font-semibold')}>{notification.title}</p>
        <p className={cn('text-xs text-muted-foreground', clampMessage && 'line-clamp-2')}>{notification.message}</p>
        <p className="flex items-center gap-1.5 pt-0.5 text-[11px] text-muted-foreground">
          {formatRelativeTime(notification.createdAt)}
          {!notification.read && <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-label="Unread" />}
        </p>
      </div>
    </>
  );
}
