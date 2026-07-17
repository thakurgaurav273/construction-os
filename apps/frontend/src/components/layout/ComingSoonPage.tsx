'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import { Badge } from '@sitepilot/ui';

interface ComingSoonPageProps {
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  title: string;
  description: string;
  capabilities: string[];
}

export function ComingSoonPage({
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  title,
  description,
  capabilities,
}: ComingSoonPageProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="max-w-lg w-full"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.3 }}
            className={`inline-flex h-20 w-20 items-center justify-center rounded-2xl ${iconBg} mb-6`}
          >
            <Icon className={`h-10 w-10 ${iconColor}`} />
          </motion.div>

          <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <Badge variant="secondary" className="text-xs font-semibold tracking-wide">
              Coming Soon
            </Badge>
          </div>

          <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {description}
          </p>
        </div>

        <div className="bg-card border rounded-xl p-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            Planned Capabilities
          </p>
          <ul className="space-y-3">
            {capabilities.map((cap) => (
              <li key={cap} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
    </div>
  );
}
