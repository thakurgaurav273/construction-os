'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from '@sitepilot/ui';
import {
  ShoppingCart, CalendarClock, Users, IndianRupee, ShieldCheck, ArrowRight, Wand2,
} from 'lucide-react';
import type { SuggestedAction, ActionCategory, ActionPriority } from '../data/command-center-demo';

const CATEGORY_ICON: Record<ActionCategory, React.ComponentType<{ className?: string }>> = {
  Procurement: ShoppingCart,
  Schedule: CalendarClock,
  Workforce: Users,
  Finance: IndianRupee,
  Safety: ShieldCheck,
};

const PRIORITY_STYLE: Record<ActionPriority, string> = {
  high: 'border-red-200 text-red-600 dark:border-red-800/50 dark:text-red-400',
  medium: 'border-amber-200 text-amber-600 dark:border-amber-800/50 dark:text-amber-400',
  low: 'border-border text-muted-foreground',
};

function ActionRow({
  action,
  onRun,
}: {
  action: SuggestedAction;
  onRun: (action: SuggestedAction) => void;
}): React.ReactElement {
  const Icon = CATEGORY_ICON[action.category];
  return (
    <div className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold leading-snug">{action.title}</p>
            <Badge variant="outline" className={`h-5 shrink-0 text-[10px] capitalize ${PRIORITY_STYLE[action.priority]}`}>
              {action.priority}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{action.rationale}</p>
          <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {action.impact}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-1.5 h-7 px-2 text-xs text-primary hover:text-primary"
            onClick={() => onRun(action)}
          >
            {action.actionLabel}
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SuggestedActionsProps {
  actions: SuggestedAction[];
  onRun: (action: SuggestedAction) => void;
  className?: string;
}

export function SuggestedActions({ actions, onRun, className = '' }: SuggestedActionsProps): React.ReactElement {
  return (
    <Card className={`border-primary/20 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-primary">
          <Wand2 className="h-4 w-4" />
          Suggested AI Actions
        </CardTitle>
        <CardDescription>{actions.length} recommendations ready to action</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action) => (
          <ActionRow key={action.id} action={action} onRun={onRun} />
        ))}
      </CardContent>
    </Card>
  );
}
