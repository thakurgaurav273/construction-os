'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, FolderOpen,
} from 'lucide-react';
import {
  Button, Input, Card, CardContent,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@sitepilot/ui';
import Link from 'next/link';
import { useProjects, type Project } from '@/hooks/api/use-projects';

const statusColors: Record<string, string> = {
  ACTIVE: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  PLANNING: 'text-blue-600 bg-blue-50 border-blue-200',
  ON_HOLD: 'text-amber-600 bg-amber-50 border-amber-200',
  COMPLETED: 'text-gray-500 bg-gray-50 border-gray-200',
  CANCELLED: 'text-red-600 bg-red-50 border-red-200',
  ARCHIVED: 'text-gray-400 bg-gray-50 border-gray-100',
};

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
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectProjectOpen, setSelectProjectOpen] = useState(false);
  const router = useRouter();
  const { data: projects = [], isLoading, isError } = useProjects();

  // Filter projects to those with daily-report activity (all projects shown, filtered by name/status)
  const filtered = projects.filter((p: Project) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.clientName ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || p.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: projects.length,
    active: projects.filter((p: Project) => p.status === 'ACTIVE').length,
    planning: projects.filter((p: Project) => p.status === 'PLANNING').length,
    onHold: projects.filter((p: Project) => p.status === 'ON_HOLD').length,
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Site progress reports across all active projects
          </p>
        </div>
        <Button onClick={() => setSelectProjectOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Report
        </Button>

        <Dialog open={selectProjectOpen} onOpenChange={setSelectProjectOpen}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Select a Project</DialogTitle>
            </DialogHeader>
            <div className="mt-2 max-h-72 overflow-y-auto space-y-1">
              {isLoading && (
                <p className="text-sm text-muted-foreground py-4 text-center">Loading projects…</p>
              )}
              {!isLoading && projects.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">No projects found.</p>
              )}
              {projects.map((project: Project) => (
                <button
                  key={project.id}
                  className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                  onClick={() => {
                    router.push(`/dashboard/projects/${project.id}/daily-reports/new`);
                    setSelectProjectOpen(false);
                  }}
                >
                  {project.name}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total Projects', value: stats.total, color: 'text-foreground' },
          { label: 'Active', value: stats.active, color: 'text-emerald-600' },
          { label: 'Planning', value: stats.planning, color: 'text-blue-600' },
          { label: 'On Hold', value: stats.onHold, color: 'text-amber-600' },
        ].map((s) => (
          <motion.div key={s.label} variants={itemVariants}>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by project or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]">
            <span className="flex items-center">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PLANNING">Planning</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Location</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Progress</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Loading projects…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    Failed to load projects.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && filtered.map((project: Project, i: number) => {
                const statusClass = statusColors[project.status] ?? 'text-gray-500 bg-gray-50 border-gray-200';
                return (
                  <motion.tr
                    key={project.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">
                      <span className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                        {project.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.clientName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.location ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{project.progress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${statusClass}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/projects/${project.id}/daily-reports`}>
                          View Reports
                        </Link>
                      </Button>
                    </td>
                  </motion.tr>
                );
              })}
              {!isLoading && !isError && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
