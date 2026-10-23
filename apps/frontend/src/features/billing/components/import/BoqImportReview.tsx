'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Skeleton,
} from '@sitepilot/ui';
import { History } from 'lucide-react';
import { ImportOutcomeTable } from '@/features/data-import/components/ImportOutcomeTable';
import { ImportSummary } from '@/features/data-import/components/ImportSummary';
import { useBoqImport } from '@/hooks/api/use-billing-import';
import type { ExistingRecordPolicy } from '@/hooks/api/use-data-import';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { BoqImportResult } from '../../import-types';
import type { ReadyToReview } from './BillingImportFlow';

interface BoqImportReviewProps {
  contractId: string;
  ready: ReadyToReview;
}

/** Dry run of a BOQ sheet: lines to add, update or skip, plus quantities certified before SitePilot. */
export function BoqImportReview({ contractId, ready }: BoqImportReviewProps): React.ReactElement {
  const router = useRouter();
  const preview = useBoqImport(contractId, 'preview');
  const commit = useBoqImport(contractId, 'commit');
  const [onExisting, setOnExisting] = useState<ExistingRecordPolicy>('skip');
  const [lastBillInput, setLastBillInput] = useState('');
  const [result, setResult] = useState<BoqImportResult | null>(null);
  const [lastBillNumber, setLastBillNumber] = useState<number | undefined>(undefined);
  const { mutateAsync: runPreview } = preview;

  // Each check re-sends the sheet, so wait until typing pauses.
  useEffect(() => {
    const timer = setTimeout(() => setLastBillNumber(Number(lastBillInput) >= 1 ? Math.floor(Number(lastBillInput)) : undefined), 400);
    return () => clearTimeout(timer);
  }, [lastBillInput]);

  useEffect(() => {
    runPreview({ file: ready.file, templateId: ready.template.id, sheetName: ready.sheetName, onExisting, lastBillNumber })
      .then(setResult)
      .catch((error: unknown) => toast.error(getApiErrorMessage(error, 'Couldn’t check the sheet. Try again.')));
  }, [runPreview, ready.file, ready.template.id, ready.sheetName, onExisting, lastBillNumber]);

  async function handleImport(): Promise<void> {
    try {
      const done = await commit.mutateAsync({ file: ready.file, templateId: ready.template.id, sheetName: ready.sheetName, onExisting, lastBillNumber });
      const changed = done.summary.create + done.summary.update;
      toast.success(`BOQ imported: ${changed} ${changed === 1 ? 'line' : 'lines'}${done.opening.allowed && lastBillNumber ? `, opening balance up to RA-${String(lastBillNumber).padStart(2, '0')}` : ''}`);
      ready.finish();
      router.push(`/dashboard/billing/contracts/${contractId}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'The import didn’t finish. Nothing was changed; try again.'));
    }
  }

  if (!result) return <Skeleton className="h-72 w-full rounded-xl" />;
  const { summary, opening } = result;
  const willOpen = opening.allowed && !!lastBillNumber;
  const nothingToDo = summary.create + summary.update === 0 && !willOpen;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review the BOQ</CardTitle>
          <CardDescription>Nothing has been saved yet. Lines are matched to the BOQ by item number using the “{ready.template.name}” layout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImportSummary summary={summary} />
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Lines already in the BOQ</Label>
              <Select value={onExisting} onValueChange={(value) => { if (value === 'skip' || value === 'update') setOnExisting(value); }}>
                <SelectTrigger className="w-60" aria-label="Lines already in the BOQ"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Keep as they are</SelectItem>
                  <SelectItem value="update">Update from the sheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {preview.isPending && <p className="text-sm text-muted-foreground">Checking…</p>}
          </div>
        </CardContent>
      </Card>

      {opening.quantityLines > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-start gap-3 space-y-0">
            <History className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <CardTitle>Quantities certified before SitePilot</CardTitle>
              <CardDescription>
                {opening.quantityLines} {opening.quantityLines === 1 ? 'line has' : 'lines have'} quantities certified on earlier bills. They become one opening-balance bill, so your next bill shows them as “previous” and continues your numbering.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {opening.allowed ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="last-bill">Last bill raised before SitePilot</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">RA-</span>
                    <Input id="last-bill" type="number" min={1} max={999} className="w-24" value={lastBillInput} onChange={(event) => setLastBillInput(event.target.value)} placeholder="03" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {lastBillNumber ? `The next bill on this contract will be RA-${String(lastBillNumber + 1).padStart(2, '0')}.` : 'Leave blank to import the BOQ without previous quantities.'}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{opening.reason}</p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6"><ImportOutcomeTable rows={result.rows} /></CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={ready.editMapping}>Edit column matching</Button>
        <Button variant="outline" onClick={ready.startOver}>Upload another file</Button>
        <Button onClick={() => { void handleImport(); }} loading={commit.isPending} disabled={commit.isPending || preview.isPending || summary.error > 0 || nothingToDo}>
          {summary.error > 0 ? `Fix ${summary.error} ${summary.error === 1 ? 'row' : 'rows'} first` : 'Import BOQ'}
        </Button>
      </div>
    </div>
  );
}
