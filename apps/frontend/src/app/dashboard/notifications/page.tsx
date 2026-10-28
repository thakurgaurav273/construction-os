'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Button, Card, CardContent, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton, Tabs, TabsList, TabsTrigger,
} from '@sitepilot/ui';
import { AlertTriangle, Bell, Check, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { NotificationHistoryRow } from '@/features/notifications/components/NotificationHistoryRow';
import {
  useDeleteNotification, useMarkAllNotificationsRead, useMarkNotificationRead, useNotificationHistory, useNotificationPreferences,
  type Notification,
} from '@/hooks/api/use-notifications';
import { getApiErrorMessage } from '@/lib/api/errors';
import { PageAction, PageHeader } from '@/components/shared/PageHeader';

const ALL_CATEGORIES = 'all';

/** Everything you've been notified about in this organization, beyond the latest few in the bell. */
export default function NotificationsPage(): React.ReactElement {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const { data, isLoading, isError, isFetching, refetch } = useNotificationHistory({
    page,
    unreadOnly,
    category: category === ALL_CATEGORIES ? undefined : category,
  });
  const { data: categories = [] } = useNotificationPreferences();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const remove = useDeleteNotification();
  const filtered = unreadOnly || category !== ALL_CATEGORIES;

  function applyFilter(change: () => void): void {
    change();
    setPage(1);
  }

  function open(notification: Notification): void {
    if (!notification.read) markRead.mutate(notification.id);
    if (notification.link) router.push(notification.link);
  }

  async function deleteNotification(notification: Notification): Promise<void> {
    try {
      await remove.mutateAsync(notification.id);
      // Deleting the last row of a later page would otherwise leave an empty page.
      if (data && data.items.length === 1 && page > 1) setPage(page - 1);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't delete the notification."));
    }
  }

  return (
    <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <PageHeader
        title="Notifications"
        description="Approvals, decisions on your requests and team updates in this organization."
        actions={(
          <>
            <PageAction icon={Settings2} label="Preferences" href="/dashboard/settings#notifications" />
            <PageAction primary icon={Check} label="Mark all as read" onClick={() => markAllRead.mutate()} disabled={!data?.unread || markAllRead.isPending} />
          </>
        )}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={unreadOnly ? 'unread' : 'all'} onValueChange={(value) => applyFilter(() => setUnreadOnly(value === 'unread'))}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread{data?.unread ? ` (${data.unread})` : ''}</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={category} onValueChange={(value) => applyFilter(() => setCategory(value))}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
            {categories.map((option) => <SelectItem key={option.category} value={option.category}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <Card><CardContent className="space-y-3 p-4">{Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-16 w-full" />)}</CardContent></Card>
      ) : isError || !data ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load notifications"
          description="Check your connection and try again."
          action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
        />
      ) : data.items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={filtered ? 'Nothing matches these filters' : "You haven't been notified of anything yet"}
          description={filtered
            ? 'Try all categories, or include notifications you have already read.'
            : 'Approvals waiting for you, decisions on your requests and team changes will appear here.'}
        />
      ) : (
        <div className={isFetching ? 'opacity-70 transition-opacity' : undefined}>
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {data.items.map((notification) => (
                  <NotificationHistoryRow
                    key={notification.id}
                    notification={notification}
                    onOpen={open}
                    onMarkRead={(item) => markRead.mutate(item.id)}
                    onDelete={deleteNotification}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>{data.total.toLocaleString('en-IN')} notification{data.total === 1 ? '' : 's'}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span>Page {data.page} of {data.totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next page" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
