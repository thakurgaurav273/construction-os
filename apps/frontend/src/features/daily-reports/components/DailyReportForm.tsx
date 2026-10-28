'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@sitepilot/ui';
import {
  useCreateDailyReport, useSubmitDailyReport, useUpdateDailyReport, useUploadReportAttachment,
  type DailyReportDetail,
} from '@/hooks/api/use-daily-reports';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  dailyReportSchema, emptyDailyReportValues, toDailyReportFormValues, toDailyReportInput,
  type DailyReportFormValues,
} from '../validation/daily-report.schema';
import { GeneralInfoCard, LabourCard, RemarksCard, WorkCompletedCard } from './ReportDetailsFields';
import { EquipmentCard, IssuesCard, MaterialsCard } from './ReportLineItems';
import { ReportAttachmentsCard } from './ReportAttachmentsCard';

interface DailyReportFormProps {
  projectId: string;
  /** Omit to create a new report; pass an editable report to update it. */
  report?: DailyReportDetail;
}

type SaveIntent = 'draft' | 'submit';

export function DailyReportForm({ projectId, report }: DailyReportFormProps) {
  const router = useRouter();
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [activeIntent, setActiveIntent] = useState<SaveIntent | null>(null);

  const createReport = useCreateDailyReport(projectId);
  const updateReport = useUpdateDailyReport(projectId);
  const submitReport = useSubmitDailyReport(projectId);
  const uploadAttachment = useUploadReportAttachment(projectId);

  const form = useForm<DailyReportFormValues>({
    resolver: zodResolver(dailyReportSchema),
    defaultValues: report ? toDailyReportFormValues(report) : emptyDailyReportValues(),
  });

  const reportsPath = `/dashboard/projects/${projectId}/daily-reports`;

  /** Saves the report, then uploads queued files. Returns the files that failed to upload. */
  async function saveReport(values: DailyReportFormValues): Promise<{ saved: DailyReportDetail; failedFiles: File[] }> {
    const input = toDailyReportInput(values);
    const saved = report
      ? await updateReport.mutateAsync({ reportId: report.id, input })
      : await createReport.mutateAsync(input);

    const failedFiles: File[] = [];
    for (const file of pendingFiles) {
      try {
        await uploadAttachment.mutateAsync({ reportId: saved.id, file });
      } catch {
        failedFiles.push(file);
      }
    }
    setPendingFiles(failedFiles);
    return { saved, failedFiles };
  }

  /** A newly created report moves to its edit URL so later saves update it instead of creating duplicates. */
  function openSavedDraft(createdReportId: string | undefined): void {
    if (createdReportId) router.replace(`${reportsPath}/${createdReportId}/edit`);
  }

  async function handleSave(values: DailyReportFormValues, intent: SaveIntent): Promise<void> {
    if (intent === 'submit' && values.workCompleted.trim() === '') {
      form.setError('workCompleted', { message: 'Describe the work completed before submitting.' });
      return;
    }

    setActiveIntent(intent);
    let createdReportId: string | undefined;
    try {
      const { saved, failedFiles } = await saveReport(values);
      if (!report) createdReportId = saved.id;

      if (failedFiles.length > 0) {
        toast.error(`Report saved, but ${failedFiles.length} attachment(s) failed to upload. Add them again.`);
        openSavedDraft(createdReportId);
        return;
      }

      if (intent === 'draft') {
        toast.success('Draft saved');
        form.reset(toDailyReportFormValues(saved));
        openSavedDraft(createdReportId);
        return;
      }

      await submitReport.mutateAsync(saved.id);
      toast.success('Report submitted for review');
      router.push(`${reportsPath}/${saved.id}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't save the report. Check your connection and try again."));
      openSavedDraft(createdReportId);
    } finally {
      setActiveIntent(null);
    }
  }

  const isSaving = activeIntent !== null;

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit((values) => handleSave(values, 'submit'))}
        className="space-y-8"
        noValidate
      >
        <GeneralInfoCard />
        <WorkCompletedCard />
        <LabourCard />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <MaterialsCard />
          <EquipmentCard />
        </div>
        <IssuesCard />
        <RemarksCard />
        <ReportAttachmentsCard
          projectId={projectId}
          reportId={report?.id}
          attachments={report?.attachments ?? []}
          pendingFiles={pendingFiles}
          onPendingFilesChange={setPendingFiles}
        />

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t pt-6">
          <Button type="button" variant="ghost" onClick={() => router.push(reportsPath)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={form.handleSubmit((values) => handleSave(values, 'draft'))}
          >
            {activeIntent === 'draft' ? 'Saving…' : 'Save Draft'}
          </Button>
          <Button type="submit" disabled={isSaving}>
            <Send className="mr-2 h-4 w-4" />
            {activeIntent === 'submit' ? 'Submitting…' : 'Submit for Review'}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
