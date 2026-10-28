import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { PlatformIntegrationRecord } from '@/hooks/api/use-platform';
import { formatDate } from '@/lib/utils';

/** What's live now, without revealing the secret: its last four characters, who saved it and when it was tested. */
export function SavedIntegrationNote({ record, summary }: { record: PlatformIntegrationRecord; summary: string }): React.ReactElement {
  return (
    <div className="flex gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        <span className="font-medium text-foreground">{summary}</span> · key {record.secretHint} · tested {formatDate(record.lastVerifiedAt)} by {record.updatedByEmail}.
        {' '}Saving again replaces it; keys are never shown.
      </p>
    </div>
  );
}
