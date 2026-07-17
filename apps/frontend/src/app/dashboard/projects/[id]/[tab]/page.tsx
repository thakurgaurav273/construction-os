'use client';

import { motion } from 'framer-motion';
import { Layers, CheckCircle2 } from 'lucide-react';
import { Badge } from '@sitepilot/ui';

export default function ProjectDynamicTabPage({
  params,
}: {
  params: { id: string; tab: string };
}) {
  const tabName = params.tab
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-md w-full text-center"
      >
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-5">
          <Layers className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <h2 className="text-2xl font-bold tracking-tight">{tabName}</h2>
          <Badge variant="secondary" className="text-xs">Coming Soon</Badge>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          This module is in development and will be available in an upcoming release.
        </p>

        <div className="bg-card border rounded-xl p-5 text-left">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            What&apos;s planned
          </p>
          <ul className="space-y-2.5">
            {[
              'Detailed tracking and analytics',
              'Integration with project financials',
              'Export and reporting capabilities',
            ].map((cap) => (
              <li key={cap} className="flex items-center gap-2.5 text-sm">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                {cap}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
