'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { AlertCircle, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button, Skeleton } from '@sitepilot/ui';
import type { PaginatedDailyReports } from '@/hooks/api/use-daily-reports';
import { DailyReportStatusBadge } from './DailyReportStatusBadge';

interface OrganizationReportsTableProps {
  data: PaginatedDailyReports | undefined;
  isLoading: boolean;
  isError: boolean;
  hasFilters: boolean;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}

const COLUMNS = ['Date', 'Project', 'Author', 'Labour', 'Issues', 'Status', ''];

export function OrganizationReportsTable({
  data, isLoading, isError, hasFilters, onRetry, onPageChange,
}: OrganizationReportsTableProps) {
  if (isLoading) {
    return (
      <div className="bg-card border rounded-xl p-4 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-10 w-full" />)}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="bg-card border rounded-xl py-12 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Unable to load daily reports. Check your connection and retry.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
      </div>
    );
  }

  const firstRow = data.total === 0 ? 0 : (data.page - 1) * data.limit + 1;
  const lastRow = Math.min(data.page * data.limit, data.total);
  const totalPages = Math.max(1, Math.ceil(data.total / data.limit));

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {COLUMNS.map((column) => (
                <th key={column} className="text-left px-4 py-3 font-medium text-muted-foreground">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-12 text-center text-muted-foreground">
                  {hasFilters
                    ? 'No reports match your filters.'
                    : 'No daily reports yet. Start one from a project to build the site record.'}
                </td>
              </tr>
            )}
            {data.items.map((report) => (
              <tr key={report.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    {format(new Date(report.date), 'MMM dd, yyyy')}
                  </span>
                </td>
                <td className="px-4 py-3">{report.project.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{report.submittedBy.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{report.labourCount}</td>
                <td className="px-4 py-3">
                  {report.issues.length > 0 ? (
                    <span className="flex items-center text-amber-600 font-medium whitespace-nowrap">
                      <AlertCircle className="mr-1.5 h-3.5 w-3.5" /> {report.issues.length} logged
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-4 py-3"><DailyReportStatusBadge status={report.status} /></td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/projects/${report.projectId}/daily-reports/${report.id}`}>View</Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.total > 0 && (
        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>Showing {firstRow}–{lastRow} of {data.total}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-label="Previous page"
              disabled={data.page <= 1}
              onClick={() => onPageChange(data.page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              aria-label="Next page"
              disabled={data.page >= totalPages}
              onClick={() => onPageChange(data.page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
