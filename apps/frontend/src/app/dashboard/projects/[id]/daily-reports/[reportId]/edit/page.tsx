'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Lock } from 'lucide-react';
import { Button, Skeleton } from '@sitepilot/ui';
import { EmptyState } from '@/components/shared/EmptyState';
import { useDailyReport } from '@/hooks/api/use-daily-reports';
import { useAuthStore } from '@/store/auth.store';
import { DailyReportForm } from '@/features/daily-reports/components/DailyReportForm';
import { ReportReviewBanner } from '@/features/daily-reports/components/ReportReviewBanner';
import { canEditReport } from '@/features/daily-reports/utils/report-permissions';

export default function EditDailyReportPage({ params }: { params: { id: string; reportId: string } }) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { data: report, isLoading, isError, refetch } = useDailyReport(params.id, params.reportId);
  const reportPath = `/dashboard/projects/${params.id}/daily-reports/${params.reportId}`;

  // Decided once on arrival: submitting from this page locks the report, and the form
  // must stay mounted while it navigates to the report instead of flashing the locked state.
  const [isLocked, setIsLocked] = useState<boolean | null>(null);
  useEffect(() => {
    if (report && isLocked === null) setIsLocked(!canEditReport(report, currentUserId));
  }, [report, isLocked, currentUserId]);

  if (isLoading || (report && isLocked === null)) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <EmptyState
        className="max-w-4xl mx-auto"
        icon={AlertCircle}
        title="Unable to load this report"
        description="It may have been deleted, or your connection dropped."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  if (isLocked) {
    return (
      <EmptyState
        className="max-w-4xl mx-auto"
        icon={Lock}
        title="This report can't be edited"
        description="Only the author can edit a report, and only while it's a draft or has been sent back for changes."
        action={<Button asChild><Link href={reportPath}>View Report</Link></Button>}
      />
    );
  }

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8 pb-20"
    >
      <div className="space-y-1">
        <Link
          href={reportPath}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to Report
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">
          Edit Report — {format(new Date(report.date), 'MMM dd, yyyy')}
        </h2>
        <p className="text-muted-foreground">Changes are saved as a draft until you submit for review.</p>
      </div>

      <ReportReviewBanner report={report} />
      <DailyReportForm key={report.id} projectId={params.id} report={report} />
    </motion.div>
  );
}
