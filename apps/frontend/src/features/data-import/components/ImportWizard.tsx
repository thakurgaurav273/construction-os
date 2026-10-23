'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button, Skeleton } from '@sitepilot/ui';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  useAnalyzeSheet, useImportEntities, usePreviewImport, useRunImport,
  type ExistingRecordPolicy, type ImportEntity, type ImportRun, type ImportTemplate, type SheetAnalysis,
} from '@/hooks/api/use-data-import';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ColumnMappingStep } from './ColumnMappingStep';
import { ImportPreviewStep } from './ImportPreviewStep';
import { ImportResultStep } from './ImportResultStep';
import { ImportSteps, type WizardStep } from './ImportSteps';
import { SheetUploadStep } from './SheetUploadStep';

/**
 * Upload → match columns (first time only) → review a dry run → import. A sheet whose layout was seen
 * before skips straight to review; the file stays in the browser and is re-sent for each step.
 */
export function ImportWizard({ initialEntity }: { initialEntity: ImportEntity | null }): React.ReactElement {
  const { data: entities, isLoading, isError, refetch } = useImportEntities();
  const analyzeSheet = useAnalyzeSheet();
  const previewImport = usePreviewImport();
  const runImport = useRunImport();

  const [step, setStep] = useState<WizardStep>('upload');
  const [entity, setEntity] = useState<ImportEntity | null>(initialEntity);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<SheetAnalysis | null>(null);
  const [template, setTemplate] = useState<ImportTemplate | null>(null);
  const [onExisting, setOnExisting] = useState<ExistingRecordPolicy>('skip');
  const [preview, setPreview] = useState<ImportRun | null>(null);
  const [result, setResult] = useState<ImportRun | null>(null);

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-48 w-full rounded-xl" /><Skeleton className="h-64 w-full rounded-xl" /></div>;
  if (isError || !entities) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load import options"
        description="Check your connection and try again."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }
  const definition = entities.find((candidate) => candidate.entity === entity && candidate.allowed) ?? null;

  async function reviewWith(activeTemplate: ImportTemplate, activeFile: File, sheetName: string, policy: ExistingRecordPolicy): Promise<void> {
    try {
      setPreview(await previewImport.mutateAsync({ templateId: activeTemplate.id, file: activeFile, sheetName, onExisting: policy }));
      setStep('review');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t check the sheet. Try again.'));
    }
  }

  async function readSheet(activeFile: File, options: { sheetName?: string; headerRow?: number } = {}): Promise<void> {
    if (!entity) return;
    try {
      const next = await analyzeSheet.mutateAsync({ entity, file: activeFile, ...options });
      setFile(activeFile);
      setAnalysis(next);
      if (next.template) {
        setTemplate(next.template);
        toast.success(`Recognised your “${next.template.name}” layout`);
        await reviewWith(next.template, activeFile, next.sheetName, onExisting);
      } else {
        // Keep an open template when re-reading, so saving updates it rather than creating a copy.
        if (!options.headerRow && !options.sheetName) setTemplate(null);
        setStep('map');
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Couldn’t read that file. Check it opens in Excel and try again.'));
    }
  }

  async function handleImport(): Promise<void> {
    if (!template || !file || !analysis) return;
    try {
      const run = await runImport.mutateAsync({ templateId: template.id, file, sheetName: analysis.sheetName, onExisting });
      setResult(run);
      setStep('done');
      toast.success(`Imported ${run.summary.create + run.summary.update} records`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'The import didn’t finish. Upload the sheet again; rows that were already saved will show as existing.'));
    }
  }

  function startOver(): void {
    setStep('upload');
    setFile(null);
    setAnalysis(null);
    setTemplate(null);
    setPreview(null);
    setResult(null);
  }

  return (
    <div className="space-y-6">
      <ImportSteps current={step} />

      {step === 'upload' && (
        <SheetUploadStep
          entities={entities.filter((candidate) => !candidate.context)}
          entity={entity}
          onEntityChange={setEntity}
          onUpload={(selected) => { void readSheet(selected); }}
          reading={analyzeSheet.isPending || previewImport.isPending}
        />
      )}

      {step === 'map' && definition && analysis && file && (
        <ColumnMappingStep
          definition={definition}
          analysis={analysis}
          fileName={file.name}
          template={template}
          rereading={analyzeSheet.isPending}
          onReread={(options) => { void readSheet(file, options); }}
          onSaved={(saved) => {
            setTemplate(saved);
            void reviewWith(saved, file, analysis.sheetName, onExisting);
          }}
          onBack={startOver}
        />
      )}

      {step === 'review' && definition && template && preview && file && analysis && (
        <ImportPreviewStep
          definition={definition}
          template={template}
          preview={preview}
          onExisting={onExisting}
          onExistingChange={(policy) => {
            setOnExisting(policy);
            void reviewWith(template, file, analysis.sheetName, policy);
          }}
          refreshing={previewImport.isPending}
          importing={runImport.isPending}
          onEditMapping={() => setStep('map')}
          onImport={() => { void handleImport(); }}
          onStartOver={startOver}
        />
      )}

      {step === 'done' && definition && result && (
        <ImportResultStep definition={definition} result={result} onStartOver={startOver} />
      )}
    </div>
  );
}
