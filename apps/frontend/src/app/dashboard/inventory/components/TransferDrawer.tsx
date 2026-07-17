'use client';

import React from 'react';
import { toast } from 'sonner';
import {
  Badge, Button, ScrollArea, Skeleton, cn,
  Sheet, SheetContent, SheetTitle,
} from '@sitepilot/ui';
import {
  X, ArrowRight, Check, Package, AlertTriangle, CheckCircle2, XCircle, Ban,
} from 'lucide-react';
import {
  useTransfer, useUpdateTransfer,
  type TransferDetail, type TransferAction,
} from '@/hooks/api/use-inventory';
import { formatDate, formatNumber } from '@/lib/utils';
import { getTransferStatusMeta } from './inventory-format';

interface TransferDrawerProps {
  transferId: string | null;
  open: boolean;
  onClose: () => void;
}

interface ActionButton {
  action: TransferAction;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'outline';
}

function actionsForStatus(status: TransferDetail['status']): ActionButton[] {
  if (status === 'PENDING') {
    return [
      { action: 'approve', label: 'Approve', icon: CheckCircle2, variant: 'default' },
      { action: 'reject', label: 'Reject', icon: XCircle, variant: 'outline' },
    ];
  }
  if (status === 'APPROVED' || status === 'IN_TRANSIT') {
    return [
      { action: 'complete', label: 'Complete', icon: CheckCircle2, variant: 'default' },
      { action: 'cancel', label: 'Cancel', icon: Ban, variant: 'outline' },
    ];
  }
  return [];
}

function TransferDrawerBody({
  transfer,
  onClose,
}: {
  transfer: TransferDetail;
  onClose: () => void;
}): React.ReactElement {
  const updateTransfer = useUpdateTransfer();
  const meta = getTransferStatusMeta(transfer.status);
  const actions = actionsForStatus(transfer.status);

  async function runAction(action: TransferAction): Promise<void> {
    try {
      await updateTransfer.mutateAsync({ id: transfer.id, action });
      toast.success(`Transfer ${transfer.code} ${action}d`);
      if (action === 'complete' || action === 'reject' || action === 'cancel') onClose();
    } catch {
      toast.error(`Unable to ${action} this transfer. Please try again.`);
    }
  }

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
                  <div className="flex items-center justify-between flex-1 gap-2">
                    <span className={cn('text-sm', step.done ? 'font-medium' : 'text-muted-foreground')}>{step.stage}</span>
                    {step.date && <span className="text-xs text-muted-foreground">{formatDate(step.date)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
        </div>
      </ScrollArea>

      {/* Footer */}
      {actions.length > 0 && (
        <div className="shrink-0 border-t bg-background px-5 py-3 grid grid-cols-2 gap-2">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Button
                key={a.action}
                size="sm"
                variant={a.variant}
                className="gap-1.5"
                disabled={updateTransfer.isPending}
                onClick={() => runAction(a.action)}
              >
                <Icon className="h-3.5 w-3.5" /> {a.label}
              </Button>
            );
          })}
        </div>
      )}
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
          <TransferDrawerBody transfer={transfer} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}
