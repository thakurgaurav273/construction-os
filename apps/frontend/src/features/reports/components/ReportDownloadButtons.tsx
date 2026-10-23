'use client';

import React from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@sitepilot/ui';
import { useDownloadReport } from '@/hooks/api/use-reports';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { GeneratedReport } from '../types';

interface ReportDownloadButtonsProps {
  report: GeneratedReport;
  size?: 'sm' | 'default';
}

export function ReportDownloadButtons({ report, size = 'sm' }: ReportDownloadButtonsProps): React.ReactElement | null {
  const download = useDownloadReport();
  if (report.status !== 'COMPLETED') return null;

  async function handleDownload(format: 'pdf' | 'excel'): Promise<void> {
    try {
      await download.mutateAsync({ id: report.id, format });
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t download the report. Try again.'));
    }
  }

  return (
    <>
      {report.hasPdf && (
        <Button variant="outline" size={size} disabled={download.isPending} onClick={() => { void handleDownload('pdf'); }}>
          <FileText className="mr-1.5 h-4 w-4 text-red-500" /> PDF
        </Button>
      )}
      {report.hasExcel && (
        <Button variant="outline" size={size} disabled={download.isPending} onClick={() => { void handleDownload('excel'); }}>
          <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600" /> Excel
        </Button>
      )}
    </>
  );
}
