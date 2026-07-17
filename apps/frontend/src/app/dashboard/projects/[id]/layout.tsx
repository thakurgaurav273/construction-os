'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowLeft, Building2, MapPin, Calendar, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

import { Badge } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { cn } from '@sitepilot/ui';

import { projectDetails } from '@/data/demo';

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

export default function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const pathname = usePathname();
  const projectId = params.id;
  const project = projectDetails[projectId] || projectDetails['p1']; // Fallback to p1 for demo

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Top Navigation Bar / Breadcrumb inside the main view */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="px-4 md:px-8 py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/dashboard/projects" className="hover:text-foreground transition-colors flex items-center">
            <ArrowLeft className="mr-1 h-4 w-4" /> Projects
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium truncate">{project.name}</span>
        </div>

        {/* Project Header */}
        <div className="px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge 
                variant={project.status === 'on-track' ? 'default' : project.status === 'delayed' ? 'secondary' : 'destructive'} 
                className="capitalize text-sm px-3 py-1"
              >
                {project.status.replace('-', ' ')}
              </Badge>
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {project.location}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" /> Due {format(new Date(project.dueDate), 'MMMM do, yyyy')}
              </div>
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500 font-medium">
                <CheckCircle2 className="h-4 w-4" /> {project.progress}% Complete
              </div>
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
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {tab.name}
                  {isActive ? (
                    <motion.div
                      layoutId="project-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      initial={false}
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-8">
        <div className="max-w-7xl mx-auto w-full h-full">
          {children}
        </div>
      </div>
    </div>
  );
}
