'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, cn } from '@sitepilot/ui';
import { AlertTriangle, FileSpreadsheet, Ruler } from 'lucide-react';
import type { RaBillDetail, RaBillLine } from '../types';
import { formatAmount, formatQuantity } from '../utils/format';

interface RaBillAbstractProps {
  bill: RaBillDetail;
  /** Opens the measurement book for a line. */
  onOpenLine: (line: RaBillLine) => void;
  editable: boolean;
}

function Figure({ label, quantity, amount, unit, emphasis }: { label: string; quantity: number; amount: number; unit: string; emphasis?: boolean }): React.ReactElement {
  return (
    <div className={cn('min-w-0', emphasis && 'font-medium')}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="truncate text-sm">{formatQuantity(quantity)} {unit}</p>
      <p className="truncate text-xs text-muted-foreground">{formatAmount(amount)}</p>
    </div>
  );
}

/**
 * The abstract of the bill: for each BOQ line, what earlier bills certified, what this bill claims (and
 * certifies), and the total to date. Lines with no activity yet are hidden unless asked for.
 */
export function RaBillAbstract({ bill, onOpenLine, editable }: RaBillAbstractProps): React.ReactElement {
  const [showAll, setShowAll] = useState(editable);
  const active = bill.lines.filter((line) => line.previousQuantity !== 0 || line.claimedQuantity !== 0);
  const lines = showAll ? bill.lines : active;
  const certified = bill.status === 'CERTIFIED';

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Abstract</CardTitle>
          <CardDescription>
            {editable ? 'Open an item to enter its measurements. Totals update as you save.' : `${active.length} of ${bill.lines.length} BOQ lines billed so far.`}
          </CardDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          {editable && (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/dashboard/billing/ra-bills/${bill.id}/import-measurements`}><FileSpreadsheet className="mr-1 h-3.5 w-3.5" /> Import MB</Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowAll((value) => !value)}>
            {showAll ? 'Only billed lines' : 'All BOQ lines'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">Nothing billed yet.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {lines.map((line) => {
              const held = line.certifiedQuantity !== null ? line.claimedQuantity - line.certifiedQuantity : 0;
              return (
                <li key={line.contractItemId} className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto] lg:items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {line.itemNo}
                      {line.rateCode && <span className="ml-2 text-xs font-normal text-muted-foreground">{line.rateCode}</span>}
                    </p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{line.description}</p>
                    <p className="text-xs text-muted-foreground">@ {formatAmount(line.rate)} / {line.unit} · BOQ {formatQuantity(line.boqQuantity)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 lg:contents">
                    <Figure label="Previous" quantity={line.previousQuantity} amount={line.previousAmount} unit={line.unit} />
                    <div className="min-w-0">
                      <Figure label={certified ? 'This bill (certified)' : 'This bill'} quantity={line.thisQuantity} amount={line.thisAmount} unit={line.unit} emphasis />
                      {held > 0 && <p className="text-xs text-amber-600" title={line.certificationNote ?? undefined}>{formatQuantity(held)} held</p>}
                    </div>
                    <div className="min-w-0">
                      <Figure label="Up to date" quantity={line.upToDateQuantity} amount={line.upToDateAmount} unit={line.unit} />
                      {line.exceedsBoq && (
                        <Badge variant="warning" className="mt-1 gap-1"><AlertTriangle className="h-3 w-3" /> Over BOQ</Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="justify-self-start lg:justify-self-end" onClick={() => onOpenLine(line)}>
                    <Ruler className="mr-1 h-3.5 w-3.5" />
                    {editable ? 'Measure' : 'Measurements'}
                    {line.measurements.length > 0 && <span className="text-muted-foreground">({line.measurements.length})</span>}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
