'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, FolderOpen } from 'lucide-react';
import {
  Button, Input, Card, CardContent, Skeleton, cn,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { useProjects } from '@/hooks/api/use-projects';
import {
  useDailyReportSummary, useOrganizationDailyReports, type DailyReportStatus,
} from '@/hooks/api/use-daily-reports';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { REPORT_STATUS_OPTIONS } from '@/features/daily-reports/constants';
import { OrganizationReportsTable } from '@/features/daily-reports/components/OrganizationReportsTable';
import { SelectProjectDialog } from '@/features/daily-reports/components/SelectProjectDialog';

const PAGE_SIZE = 20;
const ALL = 'all';

const SUMMARY_CARDS: { status: DailyReportStatus; label: string; color: string }[] = [
  { status: 'SUBMITTED', label: 'Awaiting Review', color: 'text-blue-600' },
  { status: 'REJECTED', label: 'Changes Requested', color: 'text-amber-600' },
  { status: 'APPROVED', label: 'Approved', color: 'text-emerald-600' },
  { status: 'DRAFT', label: 'Drafts', color: 'text-foreground' },
];

function toStatusFilter(value: string): DailyReportStatus | typeof ALL {
  return REPORT_STATUS_OPTIONS.find((option) => option.value === value)?.value ?? ALL;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

export default function DailyReportsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DailyReportStatus | typeof ALL>(ALL);
  const [projectFilter, setProjectFilter] = useState(ALL);
  const [page, setPage] = useState(1);
  const [selectProjectOpen, setSelectProjectOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search.trim());
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: summary, isLoading: summaryLoading } = useDailyReportSummary();
  const reports = useOrganizationDailyReports({
    page,
    limit: PAGE_SIZE,
    search: debouncedSearch || undefined,
    status: statusFilter === ALL ? undefined : statusFilter,
    projectId: projectFilter === ALL ? undefined : projectFilter,
  });

  function applyFilter(update: () => void): void {
    update();
    setPage(1);
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Site progress reports across all projects — review submissions and track what&apos;s pending.
          </p>
        </div>
        <Button onClick={() => setSelectProjectOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Report
        </Button>
        <SelectProjectDialog
          open={selectProjectOpen}
          onOpenChange={setSelectProjectOpen}
          projects={projects}
          isLoading={projectsLoading}
        />
      </div>

      {/* Summary — each card doubles as a status filter */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {SUMMARY_CARDS.map((card) => (
          <motion.div key={card.status} variants={itemVariants}>
            <button
              type="button"
              className="w-full text-left rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-pressed={statusFilter === card.status}
              onClick={() => applyFilter(() => setStatusFilter(statusFilter === card.status ? ALL : card.status))}
            >
              <Card className={cn('transition-colors hover:bg-muted/30', statusFilter === card.status && 'border-primary')}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
                  {summaryLoading ? (
                    <Skeleton className="h-9 w-12 mt-1" />
                  ) : (
                    <p className={`text-3xl font-bold mt-1 ${card.color}`}>{summary?.[card.status] ?? 0}</p>
                  )}
                </CardContent>
              </Card>
            </button>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search work, project or author..."
            aria-label="Search reports"
            value={search}
            onChange={(e) => applyFilter(() => setSearch(e.target.value))}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => applyFilter(() => setStatusFilter(toStatusFilter(value)))}
        >
          <SelectTrigger className="w-full sm:w-[190px]" aria-label="Filter by status">
            <Filter className="mr-2 h-4 w-4 shrink-0" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {REPORT_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectFilter} onValueChange={(value) => applyFilter(() => setProjectFilter(value))}>
          <SelectTrigger className="w-full sm:w-[220px]" aria-label="Filter by project">
            <FolderOpen className="mr-2 h-4 w-4 shrink-0" />
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <OrganizationReportsTable
        data={reports.data}
        isLoading={reports.isLoading}
        isError={reports.isError}
        hasFilters={debouncedSearch !== '' || statusFilter !== ALL || projectFilter !== ALL}
        onRetry={() => reports.refetch()}
        onPageChange={setPage}
      />
    </div>
  );
}
