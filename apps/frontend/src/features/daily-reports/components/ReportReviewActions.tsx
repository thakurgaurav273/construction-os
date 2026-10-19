'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Pencil, RotateCcw, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@sitepilot/ui';
import {
  useReviewDailyReport, useSubmitDailyReport, type DailyReportDetail,
} from '@/hooks/api/use-daily-reports';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useAuthStore } from '@/store/auth.store';
import { canEditReport, canReviewReport } from '../utils/report-permissions';
import { RejectReportDialog } from './RejectReportDialog';
import { useCan } from '@/hooks/api/use-access';

/**
 * Authors edit and submit their own reports; anyone else reviews submitted ones.
 * The backend enforces the same rules — these checks only decide which buttons to show.
 */
export function ReportReviewActions({ report }: { report: DailyReportDetail }) {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const [rejectOpen, setRejectOpen] = useState(false);
  const submitReport = useSubmitDailyReport(report.projectId);
  const reviewReport = useReviewDailyReport(report.projectId);

  const can = useCan();
  const canEdit = canEditReport(report, currentUserId) && can('dailyReport.write');
  const canReview = canReviewReport(report, currentUserId) && can('dailyReport.approve');

  async function handleSubmit(): Promise<void> {
    try {
      await submitReport.mutateAsync(report.id);
      toast.success('Report submitted for review');
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't submit the report. Try again."));
    }
  }

  async function handleApprove(): Promise<void> {
    try {
      await reviewReport.mutateAsync({ reportId: report.id, decision: 'approve' });
      toast.success('Report approved');
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't approve the report. Try again."));
    }
  }

  async function handleReject(note: string): Promise<void> {
    try {
      await reviewReport.mutateAsync({ reportId: report.id, decision: 'reject', note });
      toast.success('Report sent back to the author');
      setRejectOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't send the report back. Try again."));
    }
  }

  if (canEdit) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" asChild>
          <Link href={`/dashboard/projects/${report.projectId}/daily-reports/${report.id}/edit`}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Link>
        </Button>
        <Button onClick={handleSubmit} disabled={submitReport.isPending}>
          <Send className="mr-2 h-4 w-4" />
          {submitReport.isPending ? 'Submitting…' : 'Submit for Review'}
        </Button>
      </div>
    );
  }

  if (canReview) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={reviewReport.isPending}>
          <RotateCcw className="mr-2 h-4 w-4" /> Request Changes
        </Button>
        <Button onClick={handleApprove} disabled={reviewReport.isPending}>
          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
        </Button>
        <RejectReportDialog
          open={rejectOpen}
          isPending={reviewReport.isPending}
          onOpenChange={setRejectOpen}
          onConfirm={handleReject}
        />
      </div>
    );
  }

  return null;
}
