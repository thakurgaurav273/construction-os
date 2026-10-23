'use client';

import React, { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@sitepilot/ui';
import { FileSpreadsheet, Upload } from 'lucide-react';
import type { ImportEntity, ImportEntityDefinition } from '@/hooks/api/use-data-import';
import { ENTITY_PRESENTATION } from '../import-entities';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ['.xlsx', '.csv'];

interface SheetUploadStepProps {
  entities: ImportEntityDefinition[];
  entity: ImportEntity | null;
  onEntityChange: (entity: ImportEntity) => void;
  onUpload: (file: File) => void;
  reading: boolean;
}

export function SheetUploadStep({ entities, entity, onEntityChange, onUpload, reading }: SheetUploadStepProps): React.ReactElement {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function accept(file: File | undefined): void {
    if (!file) return;
    if (!ACCEPTED.some((extension) => file.name.toLowerCase().endsWith(extension))) {
      toast.error('Upload an Excel (.xlsx) or CSV file. Older .xls files can be saved as .xlsx from Excel.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error('The file must be 5 MB or smaller. Split larger sheets into parts.');
      return;
    }
    if (!entity) {
      toast.error('First choose what the sheet contains.');
      return;
    }
    onUpload(file);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>What does the sheet contain?</CardTitle>
          <CardDescription>Import materials and vendors before stock or orders that refer to them.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Type of data">
          {entities.map((definition) => {
            const { icon: Icon, summary } = ENTITY_PRESENTATION[definition.entity];
            const selected = entity === definition.entity;
            return (
              <button
                key={definition.entity}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={!definition.allowed}
                onClick={() => onEntityChange(definition.entity)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                  !definition.allowed && 'cursor-not-allowed opacity-50',
                )}
              >
                <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
                <span>
                  <span className="block font-medium">{definition.label}</span>
                  <span className="block text-sm text-muted-foreground">
                    {definition.allowed ? summary : 'Your role can’t import this. Ask an admin.'}
                  </span>
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload your sheet</CardTitle>
          <CardDescription>
            Use your own format. The first time, SitePilot works out the columns and you confirm them. After that, sheets in the same layout import directly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              accept(event.dataTransfer.files[0]);
            }}
            className={cn(
              'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-12 text-center transition-colors',
              dragging ? 'border-primary bg-primary/5' : 'bg-muted/20',
            )}
          >
            <FileSpreadsheet className="h-10 w-10 text-primary/40" />
            <p className="text-sm text-muted-foreground">Drag an Excel or CSV file here, or</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED.join(',')}
              className="hidden"
              aria-label="Choose spreadsheet"
              onChange={(event) => {
                accept(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            <Button type="button" disabled={!entity || reading} loading={reading} onClick={() => inputRef.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" /> {reading ? 'Reading sheet…' : 'Choose file'}
            </Button>
            <p className="text-xs text-muted-foreground">.xlsx or .csv, up to 5 MB and 2,000 rows</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
