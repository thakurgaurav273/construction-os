'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sitepilot/ui';
import { ExternalLink, Vault } from 'lucide-react';
import { useCan } from '@/hooks/api/use-access';
import type { ContractDetail } from '../types';
import { formatAmount } from '../utils/format';
import { ReleaseRetentionDialog } from './ReleaseRetentionDialog';

const day = (value: string): string => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Security deposit and retention held back on certified bills, and what has been paid out so far. */
export function RetentionCard({ contract }: { contract: ContractDetail }): React.ReactElement | null {
  const can = useCan();
  const [releaseOpen, setReleaseOpen] = useState(false);
  const { retention } = contract;
  const tracksRetention = contract.adjustments.some((rule) => rule.isRetention) || retention.held > 0;
  if (!tracksRetention) return null;
  const toClient = contract.direction === 'CLIENT';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Retention</CardTitle>
          <CardDescription>{toClient ? 'Held back by the client from our bills.' : 'Held back by us from the subcontractor’s bills.'}</CardDescription>
        </div>
        {can('contract.manage') && retention.balance > 0 && (
          <Button size="sm" variant="outline" onClick={() => setReleaseOpen(true)}>
            <Vault className="mr-1 h-3.5 w-3.5" /> {toClient ? 'Record Received' : 'Release'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Held', value: retention.held },
            { label: toClient ? 'Received back' : 'Released', value: retention.released },
            { label: 'Balance', value: retention.balance },
          ].map((figure) => (
            <div key={figure.label}>
              <p className="text-xs text-muted-foreground">{figure.label}</p>
              <p className="text-lg font-semibold tabular-nums">{formatAmount(figure.value)}</p>
            </div>
          ))}
        </div>
        {retention.byBill.length > 0 && (
          <p className="text-xs text-muted-foreground">
            From {retention.byBill.map((entry) => `${entry.code} (${formatAmount(entry.amount)})`).join(', ')}
          </p>
        )}
        {retention.releases.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {retention.releases.map((release) => (
              <li key={release.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium tabular-nums">{formatAmount(release.amount)}</p>
                  <p className="truncate text-xs text-muted-foreground">{day(release.releasedOn)}{release.reference && ` · ${release.reference}`}{release.note && ` · ${release.note}`}</p>
                </div>
                {release.invoiceId && can('finance.view') && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/finance?invoice=${release.invoiceId}`}><ExternalLink className="mr-1 h-3.5 w-3.5" /> Vendor bill</Link>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <ReleaseRetentionDialog contract={contract} open={releaseOpen} onOpenChange={setReleaseOpen} />
    </Card>
  );
}
