'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@sitepilot/ui';
import { GuideLink } from '@/features/help/components/GuideLink';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  /** Help guide explaining what belongs here, e.g. `{ id: 'billing.contracts', label: 'Learn how contracts work' }`. */
  guide?: { id: string; label: string };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  guide,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 py-16',
        className,
      )}
    >
      <div className="h-16 w-16 rounded-2xl bg-background border shadow-sm flex items-center justify-center mb-6">
        <Icon className="h-8 w-8 text-primary/40" />
      </div>
      <h3 className="font-semibold text-lg text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action}
      {guide && <GuideLink guideId={guide.id} label={guide.label} className={action ? 'mt-4' : undefined} />}
    </motion.div>
  );
}
