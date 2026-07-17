'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft, Building2, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

import { Badge, Button, Skeleton, cn } from '@sitepilot/ui';
import { useProject } from '@/hooks/api/use-projects';

const tabs = [
  { name: 'Overview',        href: '' },
  { name: 'Budget',          href: '/budget' },
  { name: 'Timeline',        href: '/timeline' },
  { name: 'Team',            href: '/team' },
  { name: 'Daily Reports',   href: '/daily-reports' },
  { name: 'AI Assistant',    href: '/ai' },
  { name: 'Purchase Orders', href: '/purchase-orders' },
  { name: 'Documents',       href: '/documents' },
  { name: 'Materials',       href: '/materials' },
  { name: 'Workforce',       href: '/workforce' },
];

function statusVariant(status: string) {
  if (status === 'ACTIVE')    return 'default' as const;
  if (status === 'ON_HOLD')   return 'secondary' as const;
  if (status === 'COMPLETED') return 'outline' as const;
  return 'destructive' as const;
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export default function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const pathname = usePathname();
  const projectId = params.id;
  const { data: project, isLoading } = useProject(projectId);

  return (
    <div className="flex-1 flex flex-col h-full relative">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        {/* Breadcrumb */}
        <div className="px-4 md:px-8 py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/projects" className="hover:text-foreground transition-colors flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" /> Projects
          </Link>
          <ChevronRight className="h-4 w-4" />
          {isLoading
            ? <Skeleton className="h-4 w-40" />
            : <span className="text-foreground font-medium truncate">{project?.name ?? 'Project'}</span>}
        </div>

        {/* Project Header */}
        <div className="px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Building2 className="h-6 w-6" />
              </div>
              {isLoading
                ? <Skeleton className="h-9 w-64" />
                : <h1 className="text-3xl font-bold tracking-tight">{project?.name}</h1>}
              {!isLoading && project && (
                <Badge variant={statusVariant(project.status)} className="capitalize text-sm px-3 py-1">
                  {statusLabel(project.status)}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {isLoading ? (
                <Skeleton className="h-4 w-80" />
              ) : project ? (
                <>
                  {project.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> {project.location}
                    </div>
                  )}
                  {project.expectedCompletion && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Due {format(new Date(project.expectedCompletion), 'MMMM do, yyyy')}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-medium">
                    <CheckCircle2 className="h-4 w-4" /> {project.progress}% Complete
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Button variant="outline">Project Settings</Button>
            <Button>Update Progress</Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-8 w-full overflow-x-auto scrollbar-none">
          <nav className="flex space-x-1 border-b" aria-label="Tabs">
            {tabs.map((tab) => {
              const fullHref = `/dashboard/projects/${projectId}${tab.href}`;
              const isActive = tab.href === ''
                ? pathname === `/dashboard/projects/${projectId}`
                : pathname.startsWith(fullHref);

              return (
                <Link
                  key={tab.name}
                  href={fullHref}
                  className={cn(
                    'relative min-w-max px-4 py-3 text-sm font-medium transition-colors hover:text-foreground',
                    isActive ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {tab.name}
                  {isActive && (
                    <motion.div
                      layoutId="project-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      initial={false}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-8">
        <div className="max-w-7xl mx-auto w-full h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
