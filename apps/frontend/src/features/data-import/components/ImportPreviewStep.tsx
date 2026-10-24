'use client';

import React from 'react';
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Download } from 'lucide-react';
import type {
  ExistingRecordPolicy, ImportEntityDefinition, ImportRun, ImportTemplate,
} from '@/hooks/api/use-data-import';
import { downloadIssues } from '../import-entities';
import { ImportOutcomeTable } from './ImportOutcomeTable';
import { ImportSummary } from './ImportSummary';

interface ImportPreviewStepProps {
  definition: ImportEntityDefinition;
  template: ImportTemplate;
  preview: ImportRun;
  onExisting: ExistingRecordPolicy;
  onExistingChange: (policy: ExistingRecordPolicy) => void;
  refreshing: boolean;
  importing: boolean;
  onEditMapping: () => void;
  onImport: () => void;
  onStartOver: () => void;
}

export function ImportPreviewStep({
  definition, template, preview, onExisting, onExistingChange, refreshing, importing, onEditMapping, onImport, onStartOver,
}: ImportPreviewStepProps): React.ReactElement {
  const writable = preview.summary.create + preview.summary.update;

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Review before importing</CardTitle>
          <CardDescription>
            Read with the “{template.name}” layout. Nothing is saved until you import; rows with problems are left out.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onEditMapping}>Edit column matches</Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <ImportSummary summary={preview.summary} />

        {definition.canUpdateExisting && (
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="on-existing" className="text-sm font-medium">Rows that already exist in SitePilot</label>
            <Select value={onExisting} onValueChange={(value) => onExistingChange(value === 'update' ? 'update' : 'skip')} disabled={refreshing}>
              <SelectTrigger id="on-existing" className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">Skip them</SelectItem>
                <SelectItem value="update">Update them from the sheet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <ImportOutcomeTable rows={preview.rows} />

        <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onStartOver}>Start over</Button>
            {preview.summary.error > 0 && (
              <Button type="button" variant="outline" onClick={() => downloadIssues(preview.rows, definition.label)}>
                <Download className="mr-1.5 h-4 w-4" /> Download problems
              </Button>
            )}
          </div>
          <Button type="button" onClick={onImport} loading={importing} disabled={writable === 0 || importing || refreshing}>
            {writable === 0 ? 'Nothing to import' : `Import ${writable} ${writable === 1 ? 'record' : 'records'}`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
