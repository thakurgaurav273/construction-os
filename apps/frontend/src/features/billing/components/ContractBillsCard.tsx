'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@sitepilot/ui';
import { ChevronRight, FilePlus2, Receipt } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import type { ContractDetail } from '../types';
import { formatAmount, formatPeriod } from '../utils/format';
import { BillStatusBadge } from './BillStatusBadge';

interface ContractBillsCardProps {
  contract: ContractDetail;
  /** Why a new bill can't start, or null when it can. */
  blockedReason: string | null;
  canPrepare: boolean;
  onNewBill: () => void;
}

export function ContractBillsCard({ contract, blockedReason, canPrepare, onNewBill }: ContractBillsCardProps): React.ReactElement {
  const bills = [...contract.bills].reverse();
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>RA Bills</CardTitle>
          <CardDescription>{blockedReason ?? 'Bills run in order; each one starts from what the last certified.'}</CardDescription>
        </div>
        {canPrepare && (
          <Button size="sm" onClick={onNewBill} disabled={!!blockedReason}>
            <FilePlus2 className="mr-1 h-3.5 w-3.5" /> New RA Bill
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {bills.length === 0 ? (
          <EmptyState icon={Receipt} title="No bills yet" description="Start the first RA bill once work has been measured on site." />
        ) : (
          <ul className="divide-y rounded-xl border">
            {bills.map((bill) => (
              <li key={bill.id}>
                <Link
                  href={`/dashboard/billing/ra-bills/${bill.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{bill.code}</p>
                    <p className="text-xs text-muted-foreground">{formatPeriod(bill.periodFrom, bill.periodTo)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatAmount(bill.netAmount)}</p>
                    <p className="text-xs text-muted-foreground">Gross {formatAmount(bill.grossAmount)}</p>
                  </div>
                  <BillStatusBadge status={bill.status} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
