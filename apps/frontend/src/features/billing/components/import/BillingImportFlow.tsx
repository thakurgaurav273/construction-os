'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { ColumnMappingStep } from '@/features/data-import/components/ColumnMappingStep';
import { ImportSteps, type WizardStep } from '@/features/data-import/components/ImportSteps';
import { SheetDropZone } from '@/features/data-import/components/SheetDropZone';
import {
  useAnalyzeBillingSheet, useBillingImportDefinitions, useSaveBillingLayout, type BillingSheetTarget,
} from '@/hooks/api/use-billing-import';
import type { ImportTemplate, SheetAnalysis } from '@/hooks/api/use-data-import';
import { getApiErrorMessage } from '@/lib/api/errors';

export interface ReadyToReview {
  file: File;
  template: ImportTemplate;
  sheetName: string;
  /** Back to column mapping, e.g. to fix a wrong column. */
  editMapping: () => void;
  startOver: () => void;
  finish: () => void;
}

interface BillingImportFlowProps {
  target: BillingSheetTarget;
  title: string;
  description: string;
  /** Picks the right tab of a multi-sheet workbook, e.g. the "MB" sheet for measurements. */
  preferredSheet: RegExp;
  renderReview: (ready: ReadyToReview) => React.ReactNode;
}

/**
 * Upload → match columns (first time only) → review → done, for sheets that land in one contract or bill.
 * Layouts are the organization's saved templates, so a known format goes straight to review.
 */
export function BillingImportFlow({ target, title, description, preferredSheet, renderReview }: BillingImportFlowProps): React.ReactElement {
  const entity = target.kind === 'boq' ? 'BOQ' : 'MEASUREMENT_BOOK';
  const { data: entities, isLoading, isError, refetch } = useBillingImportDefinitions();
  const analyze = useAnalyzeBillingSheet(target);
  const saveLayout = useSaveBillingLayout(target);
  const [step, setStep] = useState<WizardStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<SheetAnalysis | null>(null);
  const [template, setTemplate] = useState<ImportTemplate | null>(null);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  const definition = entities?.find((candidate) => candidate.entity === entity);
  if (isError || !definition) {
    return <EmptyState icon={AlertTriangle} title="Unable to load the import" description="Check your connection and try again." action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>} />;
  }

  async function read(activeFile: File, options: { sheetName?: string; headerRow?: number } = {}): Promise<void> {
    try {
      let next = await analyze.mutateAsync({ file: activeFile, ...options });
      // A workbook with an Abstract and an MB tab opens on the first; move to the one this import needs.
      const better = next.sheetNames.find((name) => preferredSheet.test(name));
      if (!options.sheetName && better && better !== next.sheetName) next = await analyze.mutateAsync({ file: activeFile, sheetName: better });
      setFile(activeFile);
      setAnalysis(next);
      if (next.template) {
        setTemplate(next.template);
        toast.success(`Recognised your “${next.template.name}” layout`);
        setStep('review');
      } else {
        if (!options.headerRow && !options.sheetName) setTemplate(null);
        setStep('map');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t read that file. Check it opens in Excel and try again.'));
    }
  }

  function startOver(): void {
    setStep('upload');
    setFile(null);
    setAnalysis(null);
    setTemplate(null);
  }

  return (
    <div className="space-y-6">
      <ImportSteps current={step} />

      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <SheetDropZone onFile={(selected) => { void read(selected); }} reading={analyze.isPending} />
          </CardContent>
        </Card>
      )}

      {step === 'map' && analysis && file && (
        <ColumnMappingStep
          definition={definition}
          analysis={analysis}
          fileName={file.name}
          template={template}
          rereading={analyze.isPending}
          onReread={(options) => { void read(file, options); }}
          onSaveTemplate={(input, id) => saveLayout.mutateAsync({ input, id })}
          onSaved={(saved) => {
            setTemplate(saved);
            setStep('review');
          }}
          onBack={startOver}
        />
      )}

      {(step === 'review' || step === 'done') && file && template && analysis && renderReview({
        file,
        template,
        sheetName: analysis.sheetName,
        editMapping: () => setStep('map'),
        startOver,
        finish: () => setStep('done'),
      })}
    </div>
  );
}
