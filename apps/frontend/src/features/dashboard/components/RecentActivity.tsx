import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertCircle, CheckCircle2, FileText, ShoppingCart, TrendingUp, type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sitepilot/ui';
import type { DashboardActivity } from '../types';

const ACTIVITY_ICONS: Record<string, { icon: LucideIcon; className: string }> = {
  approval: { icon: CheckCircle2, className: 'text-emerald-500' },
  alert: { icon: AlertCircle, className: 'text-destructive' },
  report: { icon: FileText, className: 'text-blue-500' },
  update: { icon: TrendingUp, className: 'text-violet-500' },
};
const DEFAULT_ICON = { icon: ShoppingCart, className: 'text-amber-500' };

export function RecentActivity({ activities }: { activities: DashboardActivity[] }): React.ReactElement {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Latest changes across your organization.</CardDescription>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing yet. Activity appears here as your team works on projects.</p>
        ) : (
          <ol className="space-y-5">
            {activities.map((activity, index) => {
              const { icon: Icon, className } = ACTIVITY_ICONS[activity.type] ?? DEFAULT_ICON;
              return (
                <li key={activity.id} className="flex gap-4">
                  <div className="relative flex flex-col items-center">
                    <div className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted"><Icon className={`h-4 w-4 ${className}`} /></div>
                    {index !== activities.length - 1 && <div className="absolute bottom-[-20px] top-8 w-px bg-border" />}
                  </div>
                  <div className="min-w-0 pb-2">
                    <p className="text-sm font-medium">{activity.title}</p>
                    {activity.description && <p className="mt-0.5 text-xs text-muted-foreground">{activity.description}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activity.actor.name} · {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
