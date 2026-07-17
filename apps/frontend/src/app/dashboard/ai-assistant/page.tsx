'use client';

import { motion } from 'framer-motion';
import { Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { Badge, Button } from '@sitepilot/ui';
import Link from 'next/link';

const capabilities = [
  'Generate daily site reports from raw inputs',
  'Summarise and flag issues across all projects',
  'Detect schedule delays before they escalate',
  'Suggest purchase orders based on consumption trends',
  'Explain cost variances in plain language',
  'Answer questions about any project in seconds',
];

const examplePrompts = [
  'Which projects are at risk of delay this month?',
  'Summarise budget variance across all active projects',
  'Generate a weekly progress report for Marina Bay Tower',
  'What materials need to be reordered this week?',
];

export default function AIAssistantPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] p-6 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl w-full space-y-6"
      >
        {/* Hero */}
        <div className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 mb-6"
          >
            <Sparkles className="h-10 w-10 text-violet-500" />
          </motion.div>

          <div className="flex items-center justify-center gap-3 mb-3">
            <h1 className="text-3xl font-bold tracking-tight">AI Assistant</h1>
            <Badge variant="secondary" className="text-xs font-semibold">Coming Soon</Badge>
          </div>

          <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
            A construction-aware AI that understands your projects, budgets, and workforce - and answers in seconds.
          </p>
        </div>

        {/* Two column cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-card border rounded-xl p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Planned Capabilities
            </p>
            <ul className="space-y-3">
              {capabilities.map((cap) => (
                <li key={cap} className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-card border rounded-xl p-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Example Questions
            </p>
            <ul className="space-y-3">
              {examplePrompts.map((prompt) => (
                <li
                  key={prompt}
                  className="flex items-start gap-3 text-sm p-2.5 rounded-lg bg-muted/40 text-muted-foreground italic"
                >
                  <Sparkles className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                  &ldquo;{prompt}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA - existing project-level AI */}
        <div className="bg-gradient-to-r from-violet-500/10 to-blue-500/10 border border-violet-200/30 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Try AI Director on a project</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Project-level AI is live now - open any project to get started.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/projects">
              Open a project <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
