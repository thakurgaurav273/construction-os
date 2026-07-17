'use client';

import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ShieldCheck, Database, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { Badge, Card, CardContent, Skeleton } from '@sitepilot/ui';
import { useProjects } from '@/hooks/api/use-projects';
import { EmptyState } from '@/components/shared/EmptyState';

const HOW_IT_WORKS = [
  {
    icon: Database,
    title: 'Live project data',
    description: 'Reads each project’s real backend data - budget, schedule, team, workforce, and activity.',
  },
  {
    icon: ListChecks,
    title: 'Deterministic summaries',
    description: 'Generates budget, risk, schedule, and workforce briefings computed directly from that data.',
  },
  {
    icon: ShieldCheck,
    title: 'Never fabricates',
    description: 'No external LLM. If something isn’t available from the backend, it says “No data available”.',
  },
];

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default function AIAssistantPage() {
  const { data: projects = [], isLoading } = useProjects();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-4xl mx-auto p-6 md:p-8 space-y-8"
    >
      {/* Hero */}
      <div className="text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 mb-5">
          <Sparkles className="h-8 w-8 text-violet-500" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3">AI Assistant</h1>
        <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
          Your organization&apos;s AI entry point. Open a project&apos;s AI Director to get instant,
          data-grounded summaries of budget, schedule, risks, team, and workforce.
        </p>
      </div>

      {/* How it works */}
      <div className="grid md:grid-cols-3 gap-4">
        {HOW_IT_WORKS.map((item) => (
          <div key={item.title} className="bg-card border rounded-xl p-5">
            <item.icon className="h-5 w-5 text-violet-500 mb-3" />
            <p className="font-semibold text-sm mb-1">{item.title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>

      {/* Per-project AI Director entry points */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Open AI Director for a project</h2>
          <Badge variant="secondary" className="text-xs font-semibold">Live</Badge>
        </div>

        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No projects yet"
            description="Create a project to open its AI Director and generate data-grounded summaries."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <Link key={project.id} href={`/dashboard/projects/${project.id}/ai`}>
                <Card className="hover:border-primary/50 hover:shadow-md transition-all">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{project.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {statusLabel(project.status)} · {project.progress}% complete
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
