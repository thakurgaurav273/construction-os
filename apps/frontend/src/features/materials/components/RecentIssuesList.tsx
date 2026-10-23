import React from 'react';
import { format } from 'date-fns';
import { ArrowUpRight, Undo2 } from 'lucide-react';
import { cn } from '@sitepilot/ui';
import type { MaterialIssue } from '@/hooks/api/use-materials';
import { formatNumber } from '@/lib/utils';

/** Latest issue (MIN) and return (MRN) notes for a project, newest first. */
export function RecentIssuesList({ issues }: { issues: MaterialIssue[] }): React.ReactElement {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3">Recent Issues &amp; Returns</h3>
      {issues.length === 0 ? (
        <p className="text-xs text-muted-foreground">No material has been issued to this project yet.</p>
      ) : (
        <ul className="space-y-1">
          {issues.map((issue) => {
            const isReturn = issue.type === 'RETURN';
            const Icon = isReturn ? Undo2 : ArrowUpRight;
            return (
              <li key={issue.id} className="flex items-center gap-3 py-1.5 border-b border-dashed last:border-0">
                <div className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  isReturn ? 'bg-emerald-500/10' : 'bg-orange-500/10',
                )}>
                  <Icon className={cn('h-4 w-4', isReturn ? 'text-emerald-600 dark:text-emerald-400' : 'text-orange-600 dark:text-orange-400')} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{issue.material.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {issue.code} · {isReturn ? 'to' : 'from'} {issue.warehouse.name} · {issue.issuedBy.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold">
                    {isReturn ? '−' : '+'}{formatNumber(issue.quantity)} {issue.material.unit}
                  </p>
                  <p className="text-xs text-muted-foreground">{format(new Date(issue.issuedOn), 'dd MMM')}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
