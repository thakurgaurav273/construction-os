'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';
import {
  FileText, Plus, Search, Filter,
  CheckCircle2, Clock, AlertCircle, CloudRain, Sun, Cloud,
} from 'lucide-react';
import { Button, Input, Badge, Card, CardContent } from '@sitepilot/ui';
import Link from 'next/link';

const reports = [
  {
    id: 'r1',
    project: 'Marina Bay Residential Tower',
    projectId: 'p1',
    date: subDays(new Date(), 1).toISOString(),
    author: 'David Chen',
    weather: 'Sunny',
    weatherIcon: Sun,
    progress: 46,
    issues: 0,
    status: 'approved',
  },
  {
    id: 'r2',
    project: 'NH-48 Highway Extension',
    projectId: 'p2',
    date: subDays(new Date(), 1).toISOString(),
    author: 'Michael Chen',
    weather: 'Cloudy',
    weatherIcon: Cloud,
    progress: 33,
    issues: 2,
    status: 'flagged',
  },
  {
    id: 'r3',
    project: 'Smart City Sector 9',
    projectId: 'p3',
    date: subDays(new Date(), 1).toISOString(),
    author: 'Elena Rostova',
    weather: 'Rainy',
    weatherIcon: CloudRain,
    progress: 78,
    issues: 1,
    status: 'submitted',
  },
  {
    id: 'r4',
    project: 'Marina Bay Residential Tower',
    projectId: 'p1',
    date: subDays(new Date(), 2).toISOString(),
    author: 'David Chen',
    weather: 'Sunny',
    weatherIcon: Sun,
    progress: 45,
    issues: 0,
    status: 'approved',
  },
  {
    id: 'r5',
    project: 'Riverside Commercial Complex',
    projectId: 'p4',
    date: subDays(new Date(), 2).toISOString(),
    author: 'David Kumar',
    weather: 'Cloudy',
    weatherIcon: Cloud,
    progress: 12,
    issues: 3,
    status: 'draft',
  },
  {
    id: 'r6',
    project: 'NH-48 Highway Extension',
    projectId: 'p2',
    date: subDays(new Date(), 3).toISOString(),
    author: 'Michael Chen',
    weather: 'Sunny',
    weatherIcon: Sun,
    progress: 32,
    issues: 1,
    status: 'approved',
  },
];

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  approved: { label: 'Approved', icon: CheckCircle2, className: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  submitted: { label: 'Submitted', icon: Clock, className: 'text-blue-600 bg-blue-50 border-blue-200' },
  flagged: { label: 'Flagged', icon: AlertCircle, className: 'text-amber-600 bg-amber-50 border-amber-200' },
  draft: { label: 'Draft', icon: FileText, className: 'text-gray-500 bg-gray-50 border-gray-200' },
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

  const filtered = reports.filter(
    (r) =>
      r.project.toLowerCase().includes(search.toLowerCase()) ||
      r.author.toLowerCase().includes(search.toLowerCase()),
  );

  const stats = {
    total: reports.length,
    approved: reports.filter((r) => r.status === 'approved').length,
    pending: reports.filter((r) => r.status === 'submitted' || r.status === 'draft').length,
    flagged: reports.filter((r) => r.status === 'flagged').length,
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
        <Button asChild>
          <Link href="/dashboard/projects">
            <Plus className="mr-2 h-4 w-4" /> New Report
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'Total (7 days)', value: stats.total, color: 'text-foreground' },
          { label: 'Approved', value: stats.approved, color: 'text-emerald-600' },
          { label: 'Pending Review', value: stats.pending, color: 'text-blue-600' },
          { label: 'Flagged', value: stats.flagged, color: 'text-amber-600' },
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
            placeholder="Search by project or author..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" /> Filter
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Author</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Weather</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Issues</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((report, i) => {
                const status = statusConfig[report.status];
                const StatusIcon = status.icon;
                const WeatherIcon = report.weatherIcon;
                return (
                  <motion.tr
                    key={report.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{report.project}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {format(new Date(report.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{report.author}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <WeatherIcon className="h-4 w-4" />
                        {report.weather}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {report.issues > 0 ? (
                        <span className="text-amber-600 font-medium">{report.issues} issue{report.issues > 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/projects/${report.projectId}/daily-reports`}>
                          View
                        </Link>
                      </Button>
                    </td>
                  </motion.tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No reports found.
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
