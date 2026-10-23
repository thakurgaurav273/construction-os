'use client';

import React from 'react';
import { Button, Progress, cn } from '@sitepilot/ui';
import { Target } from 'lucide-react';
import type { ProjectMaterialLine } from '@/hooks/api/use-materials';
import { formatNumber } from '@/lib/utils';
import { formatCompactINR } from '@/features/procurement/utils/format';

interface ProjectMaterialsListProps {
  lines: ProjectMaterialLine[];
  /** Omit when the member can't change the plan. */
  onPlan?: (line: ProjectMaterialLine) => void;
}

function usageLabel(line: ProjectMaterialLine): string {
  if (line.planned <= 0) return 'No plan set';
  if (line.remaining < 0) return `${formatNumber(-line.remaining)} ${line.unit} over plan`;
  return `${formatNumber(line.remaining)} ${line.unit} left of plan`;
}

/** Material consumption against plan for one project. Rows stack as cards on small screens. */
export function ProjectMaterialsList({ lines, onPlan }: ProjectMaterialsListProps): React.ReactElement {
  return (
    <div className="rounded-xl border bg-card">
      <div className="hidden md:grid grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_minmax(0,1.5fr)_auto] gap-4 border-b px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span>Material</span>
        <span className="text-right">Planned</span>
        <span className="text-right">Issued</span>
        <span className="text-right">Value</span>
        <span>Against plan</span>
        <span className="w-8" aria-hidden />
      </div>
      <ul className="divide-y">
        {lines.map((line) => {
          const isOverPlan = line.planned > 0 && line.remaining < 0;
          const percent = line.planned > 0 ? Math.min(100, Math.round((line.consumed / line.planned) * 100)) : 0;
          return (
            <li
              key={line.materialId}
              className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_minmax(0,1.5fr)_auto] md:items-center"
            >
              <div className="col-span-2 md:col-span-1 min-w-0">
                <p className="text-sm font-medium truncate">{line.name}</p>
                <p className="text-xs text-muted-foreground">{line.sku}</p>
              </div>
              <p className="text-sm md:text-right">
                <span className="md:hidden text-xs text-muted-foreground">Planned </span>
                {line.planned > 0 ? `${formatNumber(line.planned)} ${line.unit}` : '—'}
              </p>
              <p className="text-sm font-semibold md:text-right">
                <span className="md:hidden text-xs font-normal text-muted-foreground">Issued </span>
                {formatNumber(line.consumed)} {line.unit}
              </p>
              <p className="text-sm md:text-right">
                <span className="md:hidden text-xs text-muted-foreground">Value </span>
                {formatCompactINR(line.consumedValue)}
              </p>
              <div className="col-span-2 md:col-span-1 space-y-1">
                {line.planned > 0 && (
                  <Progress value={percent} className={cn('h-1.5', isOverPlan && '[&>div]:bg-red-500')} />
                )}
                <p className={cn('text-xs', isOverPlan ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground')}>
                  {usageLabel(line)}
                </p>
              </div>
              <div className="col-span-2 md:col-span-1 flex justify-end">
                {onPlan && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label={`Set planned quantity for ${line.name}`}
                    onClick={() => onPlan(line)}
                  >
                    <Target className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
