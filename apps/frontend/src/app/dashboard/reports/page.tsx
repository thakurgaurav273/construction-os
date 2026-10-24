'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sitepilot/ui';
import { GenerateReportDialog } from '@/features/reports/components/GenerateReportDialog';
import { ReportHistoryList } from '@/features/reports/components/ReportHistoryList';
import { ReportPreviewSheet } from '@/features/reports/components/ReportPreviewSheet';
import { ReportSchedulesList } from '@/features/reports/components/ReportSchedulesList';
import { ReportTemplatesGrid } from '@/features/reports/components/ReportTemplatesGrid';
import { ScheduleReportSheet } from '@/features/reports/components/ScheduleReportSheet';
import { useReportTemplates } from '@/hooks/api/use-reports';
import type { ReportSchedule, ReportTemplate } from '@/features/reports/types';
import ReportsLoading from './loading';

const TABS = ['templates', 'history', 'schedules'] as const;
type ReportsTab = (typeof TABS)[number];

function isReportsTab(value: string | null): value is ReportsTab {
  return TABS.some((tab) => tab === value);
}

interface SchedulingState {
  template: ReportTemplate;
  schedule?: ReportSchedule;
}

function ReportsContent(): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get('tab');
  // Report emails link to ?report=<id>, which opens that report's preview.
  const previewId = searchParams.get('report');
  const fallbackTab: ReportsTab = previewId ? 'history' : 'templates';
  const tab: ReportsTab = isReportsTab(requested) ? requested : fallbackTab;
  const { data: templates = [] } = useReportTemplates();
  const [generating, setGenerating] = useState<ReportTemplate | null>(null);
  const [scheduling, setScheduling] = useState<SchedulingState | null>(null);

  const navigate = (next: ReportsTab, reportId?: string): void => {
    const params = new URLSearchParams();
    if (next !== 'templates') params.set('tab', next);
    if (reportId) params.set('report', reportId);
    const query = params.toString();
    router.replace(query ? `/dashboard/reports?${query}` : '/dashboard/reports', { scroll: false });
  };

  const editSchedule = (schedule: ReportSchedule): void => {
    const template = templates.find((candidate) => candidate.id === schedule.reportType);
    if (template) setScheduling({ template, schedule });
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
        <p className="mt-1 text-muted-foreground">Generate branded PDF and Excel reports, or schedule them to land in your team’s inbox.</p>
      </div>

      <Tabs value={tab} onValueChange={(next) => navigate(isReportsTab(next) ? next : 'templates')}>
        <TabsList data-tour="reports-tabs">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
        </TabsList>
        <TabsContent value="templates" className="mt-4">
          <ReportTemplatesGrid onGenerate={setGenerating} onSchedule={(template) => setScheduling({ template })} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <ReportHistoryList onPreview={(report) => navigate('history', report.id)} onBrowseTemplates={() => navigate('templates')} />
        </TabsContent>
        <TabsContent value="schedules" className="mt-4">
          <ReportSchedulesList onEdit={editSchedule} onBrowseTemplates={() => navigate('templates')} />
        </TabsContent>
      </Tabs>

      <GenerateReportDialog
        template={generating}
        onOpenChange={(open) => { if (!open) setGenerating(null); }}
        onQueued={() => navigate('history')}
      />
      <ScheduleReportSheet
        template={scheduling?.template ?? null}
        schedule={scheduling?.schedule}
        onOpenChange={(open) => { if (!open) setScheduling(null); }}
      />
      <ReportPreviewSheet reportId={previewId} onOpenChange={(open) => { if (!open) navigate('history'); }} />
    </div>
  );
}

export default function ReportsPage(): React.ReactElement {
  return (
    <Suspense fallback={<ReportsLoading />}>
      <ReportsContent />
    </Suspense>
  );
}
