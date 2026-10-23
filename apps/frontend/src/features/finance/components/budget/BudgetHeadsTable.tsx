import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Button, Progress, cn } from '@sitepilot/ui';
import { formatCompactINR } from '@/features/procurement/utils/format';
import type { BudgetHead, ProjectBudget } from '../../types';

interface BudgetHeadsTableProps {
  budget: ProjectBudget;
  canManage: boolean;
  onEdit: (head: BudgetHead) => void;
  onDelete: (head: BudgetHead) => void;
}

function usageColor(percent: number): string {
  if (percent > 100) return 'bg-destructive';
  if (percent >= 85) return 'bg-amber-500';
  return 'bg-primary';
}

const money = (amount: number): string => (amount === 0 ? '—' : formatCompactINR(amount));

/** One row per head; a card per head on phones. */
export function BudgetHeadsTable({ budget, canManage, onEdit, onDelete }: BudgetHeadsTableProps): React.ReactElement {
  const { unbudgeted } = budget;
  const hasUnbudgeted = unbudgeted.committed > 0 || unbudgeted.spent > 0;
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="hidden grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_minmax(0,1.4fr)_auto] gap-4 border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
        <span>Head</span><span className="text-right">Allocated</span><span className="text-right">Committed</span>
        <span className="text-right">Spent</span><span className="text-right">Left</span><span>Used</span><span className="w-16" />
      </div>
      <ul className="divide-y">
        {budget.heads.map((head) => (
          <li key={head.id} className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 text-sm md:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_minmax(0,1.4fr)_auto] md:items-center">
            <span className="col-span-2 font-medium md:col-span-1">{head.category}</span>
            <span className="text-muted-foreground md:hidden">Allocated</span>
            <span className="text-right tabular-nums">{money(head.allocated)}</span>
            <span className="text-muted-foreground md:hidden">Committed</span>
            <span className="text-right tabular-nums">{money(head.committed)}</span>
            <span className="text-muted-foreground md:hidden">Spent</span>
            <span className="text-right tabular-nums">{money(head.spent)}</span>
            <span className="text-muted-foreground md:hidden">Left</span>
            <span className={cn('text-right font-medium tabular-nums', head.remaining < 0 && 'text-destructive')}>
              {head.remaining < 0 ? `−${formatCompactINR(-head.remaining)}` : money(head.remaining)}
            </span>
            <div className="col-span-2 flex items-center gap-2 pt-1 md:col-span-1 md:pt-0">
              <Progress value={Math.min(head.utilizationPercent, 100)} className="h-2" indicatorColor={usageColor(head.utilizationPercent)} />
              <span className={cn('w-11 shrink-0 text-right text-xs tabular-nums', head.utilizationPercent > 100 && 'text-destructive')}>
                {head.utilizationPercent}%
              </span>
            </div>
            <div className="col-span-2 flex justify-end gap-1 md:col-span-1 md:w-16">
              {canManage && (
                <>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${head.category}`} onClick={() => onEdit(head)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/90" aria-label={`Remove ${head.category}`} onClick={() => onDelete(head)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </li>
        ))}
        {hasUnbudgeted && (
          <li className="grid grid-cols-2 gap-x-4 gap-y-1 bg-amber-50/60 px-4 py-3 text-sm dark:bg-amber-950/20 md:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))_minmax(0,1.4fr)_auto] md:items-center">
            <span className="col-span-2 md:col-span-1">
              <span className="font-medium">Unbudgeted</span>
              <span className="block text-xs text-muted-foreground">Orders and bills in categories without a head</span>
            </span>
            <span className="text-muted-foreground md:hidden">Allocated</span><span className="text-right">—</span>
            <span className="text-muted-foreground md:hidden">Committed</span><span className="text-right tabular-nums">{money(unbudgeted.committed)}</span>
            <span className="text-muted-foreground md:hidden">Spent</span><span className="text-right tabular-nums">{money(unbudgeted.spent)}</span>
            <span className="hidden md:block" /><span className="hidden md:block" /><span className="hidden md:block" />
          </li>
        )}
      </ul>
    </div>
  );
}
