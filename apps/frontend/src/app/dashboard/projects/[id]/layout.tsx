'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft, Building2, MapPin, Calendar, CheckCircle2, Archive, AlertTriangle, Lock } from 'lucide-react';
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
  const can = useCan();
  const accessLoaded = useCurrentAccess().data !== undefined;
  const isTabActive = (href: string): boolean => (href === ''
    ? pathname === `/dashboard/projects/${projectId}`
    : pathname.startsWith(`/dashboard/projects/${projectId}${href}`));
  const visibleTabs = tabs.filter((tab) => !tab.permission || can(tab.permission));
  const blockedTab = accessLoaded ? tabs.find((tab) => tab.permission && isTabActive(tab.href) && !can(tab.permission)) : undefined;

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

          {project && (
            <div className="flex items-center gap-3 shrink-0">
              {project.status !== 'ARCHIVED' && (
                <Can permission="project.update">
                  <Button onClick={() => setEditOpen(true)}>Edit Project</Button>
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

      <div className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-8">
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
