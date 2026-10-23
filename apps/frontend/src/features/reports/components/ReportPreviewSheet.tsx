'use client';

import React from 'react';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { Button, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, Skeleton, cn } from '@sitepilot/ui';
import { EmptyState } from '@/components/shared/EmptyState';
import { useReport } from '@/hooks/api/use-reports';
import { useOrganizationSettings } from '@/hooks/api/use-settings';
import { formatCell, formatPeriod, isInProgress } from '../report-presentation';
import type { ReportDocument } from '../types';
import { ReportDownloadButtons } from './ReportDownloadButtons';
import { ReportSectionView } from './ReportSectionView';

interface ReportPreviewSheetProps {
  reportId: string | null;
  onOpenChange: (open: boolean) => void;
}

function scopeLabel(document: ReportDocument): string {
  if (document.allProjects) return 'All projects';
  return document.projectNames.join(', ') || 'No projects';
}

function ReportBody({ document, currency }: { document: ReportDocument; currency: string }): React.ReactElement {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {document.metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{metric.label}</p>
            <p className={cn('mt-1 text-lg font-semibold tabular-nums', metric.tone === 'bad' && 'text-destructive', metric.tone === 'good' && 'text-emerald-600')}>
              {formatCell(metric.value, metric.kind, currency)}
            </p>
            {metric.hint && <p className="text-[11px] text-muted-foreground">{metric.hint}</p>}
          </div>
        ))}
      </div>
      {document.aiSummary && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary"><Sparkles className="h-3.5 w-3.5" /> Summary</p>
          <p className="text-sm leading-relaxed">{document.aiSummary}</p>
        </div>
      )}
      {document.sections.map((section) => <ReportSectionView key={section.title} section={section} currency={currency} />)}
    </div>
  );
}

export function ReportPreviewSheet({ reportId, onOpenChange }: ReportPreviewSheetProps): React.ReactElement {
  const { data: report, isLoading, isError, refetch } = useReport(reportId);
  const { data: organization } = useOrganizationSettings();
  const currency = organization?.currency ?? 'INR';
  const document = report?.document ?? null;

  function content(): React.ReactNode {
    if (isLoading) return <div className="space-y-3"><Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /></div>;
    if (isError || !report) {
      return (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load this report"
          description="It may have been deleted, or your connection dropped."
          action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
        />
      );
    }
    if (isInProgress(report.status)) {
      return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Generating… this usually takes a few seconds.</p>;
    }
    if (report.status === 'FAILED') return <p className="text-sm text-destructive">{report.error ?? 'This report couldn’t be generated.'}</p>;
    if (!document) return <p className="text-sm text-muted-foreground">This report was generated before previews were available. Generate it again to see it here.</p>;
    return <ReportBody document={document} currency={currency} />;
  }

  return (
    <Sheet open={reportId !== null} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-4 overflow-y-auto sm:max-w-3xl">
        <SheetHeader>
          <SheetTitle>{report?.name ?? 'Report'}</SheetTitle>
          <SheetDescription>
            {document ? `${document.subtitle} ${formatPeriod(document.period.from, document.period.to)} · ${scopeLabel(document)}` : 'Preview'}
          </SheetDescription>
        </SheetHeader>
        {report && <div className="flex flex-wrap gap-2"><ReportDownloadButtons report={report} size="default" /></div>}
        {content()}
      </SheetContent>
    </Sheet>
  );
}
