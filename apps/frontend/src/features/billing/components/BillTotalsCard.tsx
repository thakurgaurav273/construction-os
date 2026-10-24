'use client';

import React, { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@sitepilot/ui';
import { Pencil } from 'lucide-react';
import type { RaBillDetail } from '../types';
import { formatAmount } from '../utils/format';
import { BillAdjustmentsDialog } from './BillAdjustmentsDialog';

function Row({ label, value, strong, muted }: { label: string; value: number; strong?: boolean; muted?: boolean }): React.ReactElement {
  return (
    <div className={`flex justify-between gap-3 text-sm ${strong ? 'border-t pt-2 font-semibold' : ''} ${muted ? 'text-muted-foreground' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value < 0 ? `− ${formatAmount(-value)}` : formatAmount(value)}</span>
    </div>
  );
}

/** Gross for this bill, then each tax and deduction, down to the net payable. */
export function BillTotalsCard({ bill, editable }: { bill: RaBillDetail; editable: boolean }): React.ReactElement {
  const [editOpen, setEditOpen] = useState(false);
  const { totals } = bill;
  const heldAmount = bill.status === 'CERTIFIED' ? totals.claimedGross - totals.grossAmount : 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Bill amount</CardTitle>
        {editable && (
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Taxes & deductions
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <Row label="Previous bills (gross)" value={totals.previousGross} muted />
        <Row label="Up to date (gross)" value={totals.upToDateGross} muted />
        {heldAmount > 0 && <Row label="Claimed but held" value={-heldAmount} muted />}
        <Row label="This bill (gross)" value={totals.grossAmount} strong />
        {bill.adjustments.map((adjustment) => (
          <Row key={adjustment.id} label={adjustment.label} value={adjustment.amount} />
        ))}
        <div className="flex justify-between gap-3 rounded-lg bg-primary/5 px-3 py-2 text-base font-semibold">
          <span>Net payable</span>
          <span className="tabular-nums">{formatAmount(totals.netAmount)}</span>
        </div>
      </CardContent>
      {editable && <BillAdjustmentsDialog bill={bill} open={editOpen} onOpenChange={setEditOpen} />}
    </Card>
  );
}
