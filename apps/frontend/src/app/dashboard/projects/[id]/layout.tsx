'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, ArrowLeft, Building2, MapPin, Calendar, CheckCircle2, Archive, AlertTriangle, Lock, Pencil } from 'lucide-react';
import type { Permission } from '@sitepilot/types';
import { format } from 'date-fns';

import { Badge, Button, Skeleton, cn } from '@sitepilot/ui';
import { useProject } from '@/hooks/api/use-projects';
import { ProjectFormDialog } from '../components/ProjectFormDialog';
import { Can } from '@/components/shared/Can';
import { useCan, useCurrentAccess } from '@/hooks/api/use-access';
import { EmptyState } from '@/components/shared/EmptyState';
import { ProjectActionsMenu } from '../components/ProjectActionsMenu';

/** Tabs with a permission are hidden, and their page refused, for members without it. */
const tabs: { name: string; href: string; permission?: Permission }[] = [
  { name: 'Overview',        href: '' },
  { name: 'Budget',          href: '/budget',          permission: 'finance.view' },
  { name: 'Timeline',        href: '/timeline' },
  { name: 'Team',            href: '/team' },
  { name: 'Daily Reports',   href: '/daily-reports',   permission: 'dailyReport.view' },
  { name: 'AI Assistant',    href: '/ai',              permission: 'ai.use' },
  { name: 'Purchase Orders', href: '/purchase-orders', permission: 'procurement.view' },
  { name: 'Documents',       href: '/documents' },
  { name: 'Materials',       href: '/materials',       permission: 'material.view' },
  { name: 'Workforce',       href: '/workforce',       permission: 'workforce.view' },
];

const COMPACT_AFTER_PX = 48;
const EXPAND_BELOW_PX = 8;

function statusVariant(status: string) {
  if (status === 'ACTIVE') return 'default' as const;
  if (status === 'COMPLETED') return 'outline' as const;
  if (status === 'CANCELLED') return 'destructive' as const;
  return 'secondary' as const;
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
  const { data: project, isLoading, isError, refetch } = useProject(projectId);
  const [editOpen, setEditOpen] = useState(false);
  const [compact, setCompact] = useState(false);

  // Desktop only (phones scroll the whole page): shrink the header once the tab content is scrolled, and
  // restore it near the top. The gap between the two thresholds stops it flickering as its height changes.
  function handleContentScroll(event: React.UIEvent<HTMLDivElement>): void {
    const top = event.currentTarget.scrollTop;
    if (!compact && top > COMPACT_AFTER_PX) setCompact(true);
    else if (compact && top < EXPAND_BELOW_PX) setCompact(false);
  }
  const can = useCan();
  const accessLoaded = useCurrentAccess().data !== undefined;
  const isTabActive = (href: string): boolean => (href === ''
    ? pathname === `/dashboard/projects/${projectId}`
    : pathname.startsWith(`/dashboard/projects/${projectId}${href}`));
  const visibleTabs = tabs.filter((tab) => !tab.permission || can(tab.permission));
  const blockedTab = accessLoaded ? tabs.find((tab) => tab.permission && isTabActive(tab.href) && !can(tab.permission)) : undefined;

  return (
    <div className="relative flex flex-1 flex-col md:h-full">
      {/* Desktop: the project header stays put and the tab content scrolls. Phones: the whole page scrolls, so the header doesn't take half the screen. */}
      <div className="z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:sticky md:top-0">
        {/* Breadcrumb: folds away once the page is scrolled on desktop. */}
        <AnimatePresence initial={false}>
          {!compact && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 px-4 pt-3 text-sm text-muted-foreground md:px-8">
                <Link href="/dashboard/projects" className="flex items-center transition-colors hover:text-foreground">
                  <ArrowLeft className="mr-1 h-4 w-4" /> Projects
                </Link>
                <ChevronRight className="h-4 w-4 shrink-0" />
                {isLoading
                  ? <Skeleton className="h-4 w-40" />
                  : <span className="truncate font-medium text-foreground">{project?.name ?? 'Project'}</span>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Project header: full on load, one slim row while scrolled (desktop), back to full at the top. */}
        <div className={cn('flex items-start justify-between gap-3 px-4 transition-[padding] duration-200 md:items-center md:px-8', compact ? 'py-2.5' : 'py-4 md:py-5')}>
          <div className="flex min-w-0 items-start gap-3 md:items-center">
            <div className={cn(
              'flex shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-200',
              compact ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 md:h-12 md:w-12',
            )}>
              <Building2 className={compact ? 'h-4 w-4' : 'h-5 w-5 md:h-6 md:w-6'} />
            </div>
            <div className="min-w-0 space-y-1.5">
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                {isLoading
                  ? <Skeleton className="h-8 w-56" />
                  : <h1 className={cn('font-bold tracking-tight transition-all duration-200', compact ? 'truncate text-lg' : 'text-xl sm:text-2xl md:text-3xl')}>{project?.name}</h1>}
                {!isLoading && project && (
                  <Badge variant={statusVariant(project.status)} className={cn('capitalize', compact ? 'px-2 py-0 text-xs' : 'px-2.5 py-0.5 text-xs md:text-sm')}>
                    {statusLabel(project.status)}
                  </Badge>
                )}
                {compact && project && (
                  <span className="hidden items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-500 md:flex">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {project.progress}%
                  </span>
                )}
              </div>

              <AnimatePresence initial={false}>
                {!compact && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                      {isLoading ? (
                        <Skeleton className="h-4 w-72" />
                      ) : project ? (
                        <>
                          {project.location && (
                            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {project.location}</span>
                          )}
                          {project.expectedCompletion && (
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Due {format(new Date(project.expectedCompletion), 'd MMM yyyy')}
                            </span>
                          )}
                          <span className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-500">
                            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> {project.progress}% complete
                          </span>
                        </>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {project && (
            <div className="flex shrink-0 items-center gap-2">
              {project.status !== 'ARCHIVED' && (
                <Can permission="project.update">
                  <Button size={compact ? 'sm' : 'default'} onClick={() => setEditOpen(true)} aria-label="Edit project">
                    <Pencil className="h-4 w-4 md:mr-1.5" />
                    <span className="hidden md:inline">Edit Project</span>
                  </Button>
                </Can>
              )}
              <ProjectActionsMenu project={project} />
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="px-4 md:px-8 w-full overflow-x-auto scrollbar-none">
          <nav className="flex space-x-1 border-b" aria-label="Tabs">
            {visibleTabs.map((tab) => {
              const fullHref = `/dashboard/projects/${projectId}${tab.href}`;
              const isActive = isTabActive(tab.href);

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

      <div className="flex-1 bg-muted/20 p-4 md:overflow-y-auto md:p-8" onScroll={handleContentScroll}>
        <div className="max-w-7xl mx-auto w-full h-full space-y-6">
          {project?.status === 'ARCHIVED' && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
              <Archive className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                This project was archived{project.archivedAt ? ` on ${format(new Date(project.archivedAt), 'dd MMM yyyy')}` : ''}.
                Its records stay readable, but new reports, attendance, orders, material issues and documents are paused until
                it&apos;s restored. Leftover stock can still be returned, and bills and payments carry on in Finance.
              </p>
            </div>
          )}
          {isError ? (
            <EmptyState
              icon={AlertTriangle}
              title="Unable to load this project"
              description="It may have been deleted, or you may be offline."
              action={(
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => refetch()}>Retry</Button>
                  <Button asChild><Link href="/dashboard/projects">Back to projects</Link></Button>
                </div>
              )}
            />
          ) : blockedTab ? (
            <EmptyState
              icon={Lock}
              title={`You don’t have access to ${blockedTab.name}`}
              description="Your role or your own permissions don’t include this area. Ask an admin if you need it for your work."
            />
          ) : children}
        </div>
      </div>

      {project && (
        <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
      )}
    </div>
  );
}
