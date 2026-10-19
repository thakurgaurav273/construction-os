'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  ArrowLeft, Calendar, CloudRain, User, Users, Hammer,
  Truck, AlertTriangle, CheckCircle2, FileText, Sparkles, Paperclip,
} from 'lucide-react';
import {
  Card, CardContent, CardHeader, CardTitle,
  Badge, Button, Skeleton,
} from '@sitepilot/ui';
import { useDailyReport } from '@/hooks/api/use-daily-reports';
import { DailyReportStatusBadge } from '@/features/daily-reports/components/DailyReportStatusBadge';
import { ReportAttachmentList } from '@/features/daily-reports/components/ReportAttachmentList';
import { ReportReviewActions } from '@/features/daily-reports/components/ReportReviewActions';
import { ReportReviewBanner } from '@/features/daily-reports/components/ReportReviewBanner';

export default function DailyReportDetailPage({
  params,
}: {
  params: { id: string; reportId: string };
}) {
  const router = useRouter();
  const { data: report, isLoading, isError } = useDailyReport(params.id, params.reportId);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Report not found</h2>
        <p className="text-muted-foreground mb-6">
          This report may have been deleted or you don&apos;t have access.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  const { materialsConsumed: materials, equipmentUsed: equipment, issues, labourDetails } = report;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6 pb-10"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/projects/${params.id}/daily-reports`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Reports
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">
            Daily Report — {format(new Date(report.date), 'MMM dd, yyyy')}
          </h2>
          <div className="flex items-center gap-3 mt-1">
            <DailyReportStatusBadge status={report.status} />
            {report.submittedBy && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-3.5 w-3.5" />
                {report.submittedBy.name}
              </span>
            )}
          </div>
        </div>
        <ReportReviewActions report={report} />
      </div>

      <ReportReviewBanner report={report} />

      {/* Overview */}
      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" /> Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-3 gap-6 p-6">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Date</p>
            <p className="font-semibold">{format(new Date(report.date), 'EEEE, MMM dd, yyyy')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Weather</p>
            <p className="font-semibold flex items-center gap-1.5">
              <CloudRain className="h-4 w-4 text-blue-400" />
              {report.weather ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">Overall Progress</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${report.overallProgress ?? 0}%` }}
                />
              </div>
              <span className="text-sm font-semibold">{report.overallProgress ?? 0}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work Completed */}
      {report.workCompleted && (
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Work Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm leading-relaxed whitespace-pre-line">{report.workCompleted}</p>
          </CardContent>
        </Card>
      )}

      {/* Labour */}
      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" /> Labour
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-lg bg-muted/40 p-4 text-center">
              <p className="text-2xl font-bold">{report.labourCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Total on Site</p>
            </div>
            {labourDetails?.skilled != null && (
              <div className="rounded-lg bg-muted/40 p-4 text-center">
                <p className="text-2xl font-bold">{labourDetails.skilled}</p>
                <p className="text-xs text-muted-foreground mt-1">Skilled</p>
              </div>
            )}
            {labourDetails?.unskilled != null && (
              <div className="rounded-lg bg-muted/40 p-4 text-center">
                <p className="text-2xl font-bold">{labourDetails.unskilled}</p>
                <p className="text-xs text-muted-foreground mt-1">Unskilled</p>
              </div>
            )}
            {labourDetails?.supervisors != null && (
              <div className="rounded-lg bg-muted/40 p-4 text-center">
                <p className="text-2xl font-bold">{labourDetails.supervisors}</p>
                <p className="text-xs text-muted-foreground mt-1">Supervisors</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Materials & Equipment */}
      {(materials.length > 0 || equipment.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-6">
          {materials.length > 0 && (
            <Card>
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <Hammer className="h-4 w-4 text-muted-foreground" /> Materials Consumed
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Material</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {materials.map((m, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5">{m.material ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">
                          {m.quantity} {m.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {equipment.length > 0 && (
            <Card>
              <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground" /> Equipment Used
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-b">
                    <tr>
                      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Equipment</th>
                      <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {equipment.map((e, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5">{e.name ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right text-muted-foreground">{e.hours}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> Issues & Flags
              <Badge variant="destructive" className="ml-1">{issues.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  {issue.severity && (
                    <span className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400 mr-2">
                      {issue.severity}
                    </span>
                  )}
                  <span className="text-sm">{issue.description}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Remarks */}
      {report.remarks && (
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" /> Remarks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {report.remarks}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {report.attachments.length > 0 && (
        <Card>
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-base flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" /> Photos & Attachments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ReportAttachmentList
              projectId={params.id}
              reportId={report.id}
              attachments={report.attachments}
            />
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      {report.aiSummary && (
        <Card className="border-indigo-200 dark:border-indigo-800/60">
          <CardHeader className="border-b bg-indigo-50/50 dark:bg-indigo-950/20">
            <CardTitle className="text-base flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" /> AI Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="text-sm leading-relaxed">{report.aiSummary}</p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
