'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sitepilot/ui';
import { CheckCircle2, Download } from 'lucide-react';
import type { ImportEntityDefinition, ImportRun } from '@/hooks/api/use-data-import';
import { ENTITY_PRESENTATION, downloadIssues } from '../import-entities';
import { ImportOutcomeTable } from './ImportOutcomeTable';
import { ImportSummary } from './ImportSummary';

interface ImportResultStepProps {
  definition: ImportEntityDefinition;
  result: ImportRun;
  onStartOver: () => void;
}

export function ImportResultStep({ definition, result, onStartOver }: ImportResultStepProps): React.ReactElement {
  const { href, destination } = ENTITY_PRESENTATION[definition.entity];
  const saved = result.summary.create + result.summary.update;
  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
        <div className="space-y-1.5">
          <CardTitle>Import finished</CardTitle>
          <CardDescription>
            {saved} {saved === 1 ? 'record was' : 'records were'} saved to {destination}.
            {result.summary.error > 0 && ' Fix the problem rows in your sheet and upload it again; rows already imported will be skipped.'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ImportSummary summary={result.summary} />
        {result.summary.error > 0 && <ImportOutcomeTable rows={result.rows} />}
        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onStartOver}>Import another file</Button>
            {result.summary.error > 0 && (
              <Button type="button" variant="ghost" onClick={() => downloadIssues(result.rows, definition.label)}>
                <Download className="mr-1.5 h-4 w-4" /> Download problems
              </Button>
            )}
          </div>
          <Button asChild><Link href={href}>Open {destination}</Link></Button>
        </div>
      </CardContent>
    </Card>
  );
}
