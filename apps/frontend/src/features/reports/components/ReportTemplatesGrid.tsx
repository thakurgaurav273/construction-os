'use client';

import React from 'react';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { Can } from '@/components/shared/Can';
import { EmptyState } from '@/components/shared/EmptyState';
import { useReportTemplates } from '@/hooks/api/use-reports';
import { TYPE_ACCENTS, templateIcon } from '../report-presentation';
import type { ReportTemplate } from '../types';

interface ReportTemplatesGridProps {
  onGenerate: (template: ReportTemplate) => void;
  onSchedule: (template: ReportTemplate) => void;
}

export function ReportTemplatesGrid({ onGenerate, onSchedule }: ReportTemplatesGridProps): React.ReactElement {
  const { data: templates, isLoading, isError, refetch } = useReportTemplates();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-52 w-full rounded-xl" />)}
      </div>
    );
  }
  if (isError || !templates) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load report types"
        description="Check your connection and try again."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const Icon = templateIcon(template.icon);
        return (
          <Card key={template.id} className="flex flex-col transition-colors hover:border-primary/50">
            <CardHeader>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${TYPE_ACCENTS[template.id]}`}>
                <Icon className="h-6 w-6" />
              </div>
              <CardTitle className="mt-4">{template.name}</CardTitle>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 items-end">
              <Can
                permission="report.manage"
                fallback={<p className="w-full border-t pt-4 text-xs text-muted-foreground">Ask a project manager or admin to generate this report.</p>}
              >
                <div className="flex w-full gap-2 border-t pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => onGenerate(template)}>Generate</Button>
                  <Button variant="outline" size="icon" aria-label={`Schedule ${template.name}`} title="Schedule" onClick={() => onSchedule(template)}>
                    <CalendarClock className="h-4 w-4" />
                  </Button>
                </div>
              </Can>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
