'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Skeleton } from '@sitepilot/ui';
import { GuideLink } from '@/features/help/components/GuideLink';
import { useMeasurementImport } from '@/hooks/api/use-billing-import';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { MeasurementImportResult } from '../../import-types';
import type { ReadyToReview } from './BillingImportFlow';
import { MeasurementImportItemRow } from './MeasurementImportItemRow';

interface MeasurementImportReviewProps {
  billId: string;
  ready: ReadyToReview;
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }): React.ReactElement {
  return (
    <div className="rounded-lg border p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-2xl font-semibold tabular-nums ${tone ?? ''}`}>{value}</dd>
    </div>
  );
}

/** Dry run of a measurement book: which items match the BOQ, what each adds up to, and checks against the sheet. */
export function MeasurementImportReview({ billId, ready }: MeasurementImportReviewProps): React.ReactElement {
  const router = useRouter();
  const preview = useMeasurementImport(billId, 'preview');
  const commit = useMeasurementImport(billId, 'commit');
  const [sections, setSections] = useState<string[] | undefined>(undefined);
  const [result, setResult] = useState<MeasurementImportResult | null>(null);
  const { mutateAsync: runPreview } = preview;

  useEffect(() => {
    runPreview({ file: ready.file, templateId: ready.template.id, sheetName: ready.sheetName, sections })
      .then(setResult)
      .catch((error: unknown) => toast.error(getApiErrorMessage(error, 'Couldn’t check the sheet. Try again.')));
  }, [runPreview, ready.file, ready.template.id, ready.sheetName, sections]);

  const isSelected = (section: { label: string; selected: boolean }): boolean => (sections ? sections.includes(section.label) : section.selected);

  function toggleSection(label: string): void {
    if (!result) return;
    const current = result.sections.filter(isSelected).map((section) => section.label);
    const next = current.includes(label) ? current.filter((candidate) => candidate !== label) : [...current, label];
    if (next.length === 0) {
      toast.error('Keep at least one section.');
      return;
    }
    setSections(next);
  }

  async function handleImport(): Promise<void> {
    try {
      const done = await commit.mutateAsync({ file: ready.file, templateId: ready.template.id, sheetName: ready.sheetName, sections });
      toast.success(`Imported ${done.summary.rows} measurements for ${done.summary.importable} items`);
      ready.finish();
      router.push(`/dashboard/billing/ra-bills/${billId}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'The import didn’t finish. Check the bill and try again.'));
    }
  }

  if (!result) return <Skeleton className="h-72 w-full rounded-xl" />;
  const { summary } = result;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5">Review the measurement book <GuideLink guideId="billing.import-measurements" /></CardTitle>
          <CardDescription>
            Nothing has been saved yet. Each item’s rows replace that item’s measurements on this bill; items not in the sheet are left alone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Items to import" value={summary.importable} tone="text-emerald-600" />
            <Stat label="Measurement rows" value={summary.rows} />
            <Stat label="Not in the BOQ" value={summary.unmatched} tone={summary.unmatched > 0 ? 'text-destructive' : ''} />
            <Stat label="Things to check" value={summary.warnings} tone={summary.warnings > 0 ? 'text-amber-600' : ''} />
          </dl>
          {result.sections.length > 1 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Bill sections in the sheet</legend>
              <p className="text-xs text-muted-foreground">Untick sections already billed in SitePilot. With more than one, each row’s description starts with its section.</p>
              <div className="flex flex-wrap gap-3">
                {result.sections.map((section) => (
                  <label key={section.label} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                    <input type="checkbox" className="h-4 w-4 rounded border-input" checked={isSelected(section)} onChange={() => toggleSection(section.label)} disabled={preview.isPending} />
                    {section.label} <span className="text-xs text-muted-foreground">({section.rows} rows)</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {summary.ignoredRows > 0 && (
            <p className="text-xs text-muted-foreground">{summary.ignoredRows} rows were skipped as titles, sub-headings or working notes.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {result.items.map((item) => <MeasurementImportItemRow key={item.itemNo} item={item} />)}
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={ready.editMapping}>Edit column matching</Button>
        <Button variant="outline" onClick={ready.startOver}>Upload another file</Button>
        <Button onClick={() => { void handleImport(); }} loading={commit.isPending} disabled={commit.isPending || preview.isPending || summary.importable === 0}>
          Import {summary.rows} measurements
        </Button>
      </div>
    </div>
  );
}
