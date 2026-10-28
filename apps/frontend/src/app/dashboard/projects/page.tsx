'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, Building2, Users, Clock, MapPin, AlertTriangle, ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import { format } from 'date-fns';

import {
  Button, Input, Badge, Card, CardContent, Progress, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { useProjectList } from '@/hooks/api/use-projects';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { EmptyState } from '@/components/shared/EmptyState';
import { ProjectFormDialog } from './components/ProjectFormDialog';
import { Can } from '@/components/shared/Can';
import { PageAction, PageHeader } from '@/components/shared/PageHeader';

const STATUS_FILTERS = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED'] as const;
const PRIORITY_FILTERS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
};

function statusVariant(status: string) {
  if (status === 'ACTIVE') return 'default';
  if (status === 'COMPLETED') return 'outline';
  if (status === 'CANCELLED') return 'destructive';
  return 'secondary';
}

function statusLabel(status: string) {
  return status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function formatCrore(n: number | null | undefined) {
  if (!n) return '-';
  return `₹${(n / 10_000_000).toFixed(1)} Cr`;
}

const PAGE_SIZE = 12;

export default function ProjectsListPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading, isError, isFetching, refetch } = useProjectList({
    search: debouncedSearch.trim() || undefined,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    priority: priorityFilter === 'ALL' ? undefined : priorityFilter,
    page,
    limit: PAGE_SIZE,
  });
  const projects = data?.items ?? [];
  const filtersActive = !!search || statusFilter !== 'ALL' || priorityFilter !== 'ALL';

  function changeFilter(setter: (value: string) => void): (value: string) => void {
    return (value) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 max-w-7xl mx-auto">
      <PageHeader
        title="Projects"
        description={isLoading || !data
          ? 'Loading…'
          : `${data.total} ${statusFilter === 'ARCHIVED' ? 'archived ' : ''}project${data.total !== 1 ? 's' : ''}${statusFilter === 'ALL' ? ' (archived projects are hidden)' : ''}`}
        actions={(
          <Can permission="project.create">
            <PageAction primary icon={Plus} label="New Project" onClick={() => setCreateOpen(true)} data-tour="projects-new" />
          </Can>
        )}
      />

      <div className="flex flex-col sm:flex-row items-center gap-3" data-tour="projects-filters">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, client, or location..."
            className="pl-9"
            value={search}
            aria-label="Search projects"
            onChange={(e) => changeFilter(setSearch)(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={changeFilter(setStatusFilter)}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All except archived</SelectItem>
              {STATUS_FILTERS.map((s) => (
                <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={changeFilter(setPriorityFilter)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              {PRIORITY_FILTERS.map((p) => (
                <SelectItem key={p} value={p}>{statusLabel(p)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load projects"
          description="Check your connection and try again."
          action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
        />
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No projects found</h3>
          <p className="text-muted-foreground mt-1">
            {filtersActive
              ? 'Try adjusting your search or filters.'
              : 'Create your first project to get started.'}
          </p>
          {!filtersActive && (
            <Can permission="project.create">
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> New Project
              </Button>
            </Can>
          )}
        </div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 ${isFetching ? 'opacity-70 transition-opacity' : ''}`}
        >
          {projects.map((project) => (
            <motion.div key={project.id} variants={itemVariants}>
              <Link href={`/dashboard/projects/${project.id}`}>
                <Card className="h-full hover:shadow-md transition-all duration-200 group cursor-pointer border-border/50 hover:border-primary/50">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <Badge variant={statusVariant(project.status)} className="capitalize text-xs gap-1">
                        {project.status === 'ARCHIVED' && <Archive className="h-3 w-3" />}
                        {statusLabel(project.status)}
                      </Badge>
                    </div>

                    <div className="text-xs text-muted-foreground font-mono mb-1">{project.code}</div>
                    <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>

                    <div className="mt-4 space-y-2 flex-1">
                      {project.clientName && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Users className="mr-2 h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{project.clientName}</span>
                        </div>
                      )}
                      {project.location && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="mr-2 h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{project.location}</span>
                        </div>
                      )}
                      {project.expectedCompletion && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="mr-2 h-3.5 w-3.5 shrink-0" />
                          <span>Due {format(new Date(project.expectedCompletion), 'MMM yyyy')}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{project.progress}%</span>
                      </div>
                      <Progress value={project.progress} className="h-1.5" />
                    </div>

                    <div className="mt-4 pt-4 border-t flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Spend / Budget</span>
                      <span className="font-medium">{formatCrore(project.spent)} / {formatCrore(project.budget)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>Page {data.page} of {data.totalPages}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Next page" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ProjectFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
