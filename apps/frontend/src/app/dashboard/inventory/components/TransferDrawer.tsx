'use client';

import React from 'react';
import {
  Badge, ScrollArea, Skeleton, cn,
  Sheet, SheetContent, SheetTitle,
} from '@sitepilot/ui';
import { X, ArrowRight, Check, Package, AlertTriangle } from 'lucide-react';
import { useTransfer, type TransferDetail } from '@/hooks/api/use-inventory';
import { formatDate, formatNumber } from '@/lib/utils';
import { getTransferStatusMeta } from './inventory-format';
import { TransferActions } from './TransferActions';
import { RecordHistory } from '@/features/audit/components/RecordHistory';

interface TransferDrawerProps {
  transferId: string | null;
  open: boolean;
  onClose: () => void;
}

function TransferDrawerBody({ transfer }: { transfer: TransferDetail }): React.ReactElement {
  const meta = getTransferStatusMeta(transfer.status);

  return (
    <>
      {/* Hero */}
      <div className="shrink-0 border-b bg-muted/30 px-5 pt-6 pb-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-semibold leading-tight">{transfer.code}</h3>
          <Badge variant="outline" className={cn('font-medium', meta.badgeClass)}>{meta.label}</Badge>
        </div>
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="font-medium truncate">{transfer.fromWarehouse.name}</span>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="font-medium truncate">{transfer.toWarehouse.name}</span>
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-5 space-y-5">
          {/* Timeline */}
          <div className="rounded-xl border bg-card p-4">
            <h4 className="text-sm font-semibold mb-3">Timeline</h4>
            <div className="space-y-3">
              {transfer.timeline.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full shrink-0',
                    step.done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center justify-between flex-1 gap-2 min-w-0">
                    <span className={cn('text-sm truncate', step.done ? 'font-medium' : 'text-muted-foreground')}>
                      {step.stage}{step.actor ? <span className="font-normal text-muted-foreground"> · {step.actor}</span> : null}
                    </span>
                    {step.date && <span className="text-xs text-muted-foreground shrink-0">{formatDate(step.date)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {transfer.reviewNote && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
              <h4 className="text-sm font-semibold mb-1.5">
                {transfer.status === 'CANCELLED' ? 'Cancellation note' : 'Reason for rejection'}
              </h4>
              <p className="text-sm text-muted-foreground">{transfer.reviewNote}</p>
            </div>
          )}

          {transfer.note && (
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-sm font-semibold mb-1.5">Note</h4>
              <p className="text-sm text-muted-foreground">{transfer.note}</p>
            </div>
          )}

          {/* Items */}
          <div className="rounded-xl border bg-card p-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
              <Package className="h-4 w-4 text-muted-foreground" /> Items ({transfer.items.length})
            </h4>
            <div className="space-y-1.5">
              {transfer.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 border-b border-dashed last:border-0 py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.materialName}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <span className="text-sm font-semibold shrink-0">{formatNumber(item.quantity)} {item.unit}</span>
                </div>
              ))}
            </div>
          </div>
          <RecordHistory entityType="stock_transfer" entityId={transfer.id} />
        </div>
      </ScrollArea>

      <TransferActions transfer={transfer} />
    </>
  );
}

export function TransferDrawer({ transferId, open, onClose }: TransferDrawerProps): React.ReactElement {
  const { data: transfer, isLoading, isError } = useTransfer(transferId ?? '');

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        <SheetTitle className="sr-only">Transfer Details</SheetTitle>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 z-20 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-muted-foreground">Unable to load this transfer. Please try again.</p>
          </div>
        ) : isLoading || !transfer ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <TransferDrawerBody transfer={transfer} />
        )}
      </SheetContent>
    </Sheet>
  );
}
