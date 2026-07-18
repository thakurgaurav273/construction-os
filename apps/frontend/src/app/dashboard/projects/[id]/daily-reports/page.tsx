'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, Search, Filter, FileText, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader } from '@sitepilot/ui';
import { Button } from '@sitepilot/ui';
import { Input } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sitepilot/ui';
import { useDailyReports } from '@/hooks/api/use-daily-reports';

export default function DailyReportsListPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: reports = [], isLoading, isError } = useDailyReports(params.id);

  const filtered = reports.filter((report) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      query === '' ||
      (report.submittedBy?.name ?? '').toLowerCase().includes(query) ||
      (report.weather ?? '').toLowerCase().includes(query) ||
      report.status.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || report.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-6xl mx-auto"
    >
      <div className="flex flex-col sm:flex-row items-start justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Daily Reports</h2>
          <p className="text-muted-foreground mt-1">Track daily site progress, weather, and safety logs.</p>
        </div>
        <Link href={`/dashboard/projects/${params.id}/daily-reports/new`}>
          <Button className="shadow-lg shadow-primary/20">
            <Plus className="mr-2 h-4 w-4" /> New Report
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/20">
          <div className="flex items-center gap-4 w-full max-w-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading reports…</div>
          ) : isError ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Failed to load reports.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                  <tr>
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Author</th>
                    <th className="px-6 py-4 font-medium">Weather</th>
                    <th className="px-6 py-4 font-medium">Labour</th>
                    <th className="px-6 py-4 font-medium">Issues</th>
                    <th className="px-6 py-4 font-medium">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">No reports found.</td>
                    </tr>
                  ) : filtered.map((report) => {
                    const issues = (report.issues as { severity?: string }[] ?? []);
                    const issueCount = issues.length;
                    return (
                      <tr key={report.id} className="hover:bg-muted/10 transition-colors group">
                        <td className="px-6 py-4 font-medium flex items-center">
                          <FileText className="mr-3 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          {format(new Date(report.date), 'MMM dd, yyyy')}
                        </td>
                        <td className="px-6 py-4">{report.submittedBy?.name ?? '—'}</td>
                        <td className="px-6 py-4 text-muted-foreground">{report.weather ?? '—'}</td>
                        <td className="px-6 py-4 text-muted-foreground">{report.labourCount}</td>
                        <td className="px-6 py-4">
                          {issueCount > 0 ? (
                            <span className="flex items-center text-amber-600 font-medium">
                              <AlertCircle className="mr-1.5 h-3.5 w-3.5" /> {issueCount} logged
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={report.status === 'SUBMITTED' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {report.status === 'SUBMITTED'
                              ? <><CheckCircle2 className="mr-1 h-3 w-3" />Submitted</>
                              : <><Clock className="mr-1 h-3 w-3" />Draft</>}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/projects/${params.id}/daily-reports/${report.id}`)}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
