'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity as ActivityIcon,
  CheckCircle2,
  FileText,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, Card, CardContent, Skeleton } from '@sitepilot/ui';
import { useProjectActivities } from '@/hooks/api/use-projects';
import { formatRelativeTime } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';

const ICON_BY_TYPE: Record<string, { icon: LucideIcon; className: string }> = {
  approval: { icon: CheckCircle2, className: 'bg-primary text-primary-foreground' },
  report: { icon: FileText, className: 'bg-blue-500 text-white' },
  alert: { icon: AlertTriangle, className: 'bg-amber-500 text-white' },
  update: { icon: RefreshCw, className: 'bg-muted text-muted-foreground' },
};

function iconFor(type: string) {
  return ICON_BY_TYPE[type] ?? { icon: ActivityIcon, className: 'bg-muted text-muted-foreground' };
}

export default function ProjectTimelinePage({ params }: { params: { id: string } }) {
  const { data, isLoading, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useProjectActivities(params.id);
  const activities = data?.pages.flatMap((page) => page.items) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h3 className="text-xl font-semibold tracking-tight">Activity Timeline</h3>
        <p className="text-sm text-muted-foreground">
          Everything that has happened on this project, newest first{total > 0 ? ` · ${total} ${total === 1 ? 'event' : 'events'}` : ''}.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load the timeline"
          description="Check your connection and try again."
          action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
        />
      ) : activities.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No activity yet"
          description="Reports, approvals, and updates on this project will appear here as they happen."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="relative border-l border-border ml-6 md:ml-8 mt-8 mb-8 space-y-12 py-4">
              {activities.map((item, i) => {
                const { icon: Icon, className } = iconFor(item.type);
                return (
                  <motion.div
                    key={item.id}
                    initial={false}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative pl-8 md:pl-12 pr-6"
                  >
                    <div
                      className={`absolute -left-[17px] top-1 h-8 w-8 rounded-full border-4 border-background flex items-center justify-center ${className}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="bg-card border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-lg">{item.title}</h4>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      )}
                      {item.actor?.name && (
                        <p className="text-xs text-muted-foreground mt-3">by {item.actor.name}</p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading…' : `Load older events (${total - activities.length} more)`}
          </Button>
        </div>
      )}
    </div>
  );
}
