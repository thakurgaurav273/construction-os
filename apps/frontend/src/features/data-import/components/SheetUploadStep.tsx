'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@sitepilot/ui';
import type { ImportEntity, ImportEntityDefinition } from '@/hooks/api/use-data-import';
import { ENTITY_PRESENTATION } from '../import-entities';
import { SheetDropZone } from './SheetDropZone';

interface SheetUploadStepProps {
  entities: ImportEntityDefinition[];
  entity: ImportEntity | null;
  onEntityChange: (entity: ImportEntity) => void;
  onUpload: (file: File) => void;
  reading: boolean;
}

export function SheetUploadStep({ entities, entity, onEntityChange, onUpload, reading }: SheetUploadStepProps): React.ReactElement {
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
          <SheetDropZone onFile={onUpload} reading={reading} disabled={!entity} disabledReason="First choose what the sheet contains." />
        </CardContent>
      </Card>
    </div>
  );
}
