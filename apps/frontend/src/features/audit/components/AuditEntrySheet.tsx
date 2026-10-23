'use client';

import React from 'react';
import { format } from 'date-fns';
import { Badge, Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@sitepilot/ui';
import type { AuditLogEntry } from '@/hooks/api/use-audit-logs';

function DetailRow({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  return (
    <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 py-2 border-b border-dashed last:border-0 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="break-words">{value}</dd>
    </div>
  );
}

/** Full detail of one audit entry, including the (redacted) input that was sent. */
export function AuditEntrySheet({ entry, onClose }: { entry: AuditLogEntry | null; onClose: () => void }): React.ReactElement {
  return (
    <Sheet open={!!entry} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[520px] overflow-y-auto">
        {entry && (
          <>
            <SheetHeader>
              <SheetTitle className="text-left">{entry.actor.name} {entry.summary}</SheetTitle>
              <SheetDescription className="text-left">{format(new Date(entry.createdAt), 'dd MMM yyyy, HH:mm:ss')}</SheetDescription>
            </SheetHeader>
            <dl className="mt-6">
              <DetailRow label="Action" value={<Badge variant="outline" className="font-mono text-xs">{entry.action}</Badge>} />
              <DetailRow label="Record" value={<span className="font-mono text-xs">{entry.entityType}{entry.entityId ? ` · ${entry.entityId}` : ''}</span>} />
              {entry.projectId && <DetailRow label="Project" value={<span className="font-mono text-xs">{entry.projectId}</span>} />}
              <DetailRow label="IP address" value={entry.ipAddress ?? '—'} />
              <DetailRow label="Device" value={<span className="text-xs text-muted-foreground">{entry.userAgent ?? '—'}</span>} />
            </dl>
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-2">Details sent</h4>
              <p className="text-xs text-muted-foreground mb-2">Passwords and tokens are never stored.</p>
              <pre className="max-h-[360px] overflow-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
                {JSON.stringify(entry.metadata, null, 2)}
              </pre>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
