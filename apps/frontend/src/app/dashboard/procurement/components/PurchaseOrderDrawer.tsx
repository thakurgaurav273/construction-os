'use client';

import React from 'react';
import { Button, ScrollArea, Sheet, SheetContent, SheetTitle } from '@sitepilot/ui';
import {
  X, MapPin, CheckCircle2, XCircle, RotateCcw, Copy, Download,
  Loader2, ClipboardList, Package, GitBranch,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { StatusBadge } from './StatusBadge';
import { formatCurrency } from './procurement-format';
import { usePurchaseOrderAction } from '@/hooks/api/use-procurement';
import {
  lineItemGross,
  lineItemTotal,
  purchaseOrderSubtotal,
  purchaseOrderDiscount,
  purchaseOrderTax,
  purchaseOrderTotal,
  type PurchaseOrder,
} from '@/data/procurement-demo';

interface PurchaseOrderDrawerProps {
  order: PurchaseOrder | null;
  open: boolean;
  onClose: () => void;
}

interface DetailRowProps {
  label: string;
  children: React.ReactNode;
}

function DetailRow({ label, children }: DetailRowProps): React.ReactElement {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium mt-0.5">{children}</div>
    </div>
  );
}

export function PurchaseOrderDrawer({ order, open, onClose }: PurchaseOrderDrawerProps): React.ReactElement {
  const action = usePurchaseOrderAction();

  const isLocked = order?.approvalStatus === 'approved' || order?.approvalStatus === 'rejected';
  const currentStepIndex = order ? order.timeline.findIndex((step) => step.date === null) : -1;

  function run(kind: 'approve' | 'reject' | 'request_changes' | 'duplicate', message: string): void {
    if (!order) return;
    action.mutate(
      { id: order.id, action: kind },
      {
        onSuccess: () => {
          toast.success(message);
          if (kind === 'duplicate') onClose();
        },
      },
    );
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        {order && (
          <>
            <SheetTitle className="sr-only">Purchase Order {order.poNumber}</SheetTitle>

            <button
              type="button"
              onClick={onClose}
              className="absolute top-3.5 right-3.5 z-20 rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Hero */}
            <div className="shrink-0 border-b bg-muted/30 px-5 py-4">
              <p className="text-xl font-bold tracking-tight">{order.poNumber}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {order.vendorName} · {order.projectName}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <StatusBadge kind="approval" value={order.approvalStatus} />
                <StatusBadge kind="priority" value={order.priority} />
              </div>
            </div>

            {/* Body */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5 space-y-4">
                <section className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <ClipboardList className="h-4 w-4 text-muted-foreground" /> Details
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <DetailRow label="Vendor">{order.vendorName}</DetailRow>
                    <DetailRow label="Project">{order.projectName}</DetailRow>
                    <DetailRow label="Requested By">{order.createdBy}</DetailRow>
                    <DetailRow label="Approver">{order.approver}</DetailRow>
                    <DetailRow label="Requested Date">
                      {format(new Date(order.requestedDate), 'dd MMM yyyy')}
                    </DetailRow>
                    <DetailRow label="Expected Delivery">
                      {format(new Date(order.expectedDelivery), 'dd MMM yyyy')}
                    </DetailRow>
                    <DetailRow label="Category">{order.category}</DetailRow>
                    <DetailRow label="Delivery Status">
                      <StatusBadge kind="delivery" value={order.deliveryStatus} />
                    </DetailRow>
                  </div>
                </section>

                <section className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <MapPin className="h-4 w-4 text-muted-foreground" /> Delivery Address
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">{order.deliveryAddress}</p>
                </section>

                <section className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <Package className="h-4 w-4 text-muted-foreground" /> Line Items
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-2 font-medium">Description</th>
                          <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Qty</th>
                          <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Rate</th>
                          <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Tax</th>
                          <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Disc</th>
                          <th className="text-right py-2 pl-2 font-medium whitespace-nowrap">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-2 pr-2">
                              <p className="font-medium text-foreground">{item.description}</p>
                              <p className="text-muted-foreground">
                                {item.category} · {formatCurrency(lineItemGross(item))} gross
                              </p>
                            </td>
                            <td className="text-right py-2 px-2 whitespace-nowrap">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="text-right py-2 px-2 whitespace-nowrap">
                              {formatCurrency(item.rate)}
                            </td>
                            <td className="text-right py-2 px-2 whitespace-nowrap">{item.taxPercent}%</td>
                            <td className="text-right py-2 px-2 whitespace-nowrap">{item.discountPercent}%</td>
                            <td className="text-right py-2 pl-2 font-semibold whitespace-nowrap">
                              {formatCurrency(lineItemTotal(item))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 space-y-1.5 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(purchaseOrderSubtotal(order.items))}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Discount</span>
                      <span>-{formatCurrency(purchaseOrderDiscount(order.items))}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Tax</span>
                      <span>+{formatCurrency(purchaseOrderTax(order.items))}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t font-bold text-base">
                      <span>Grand Total</span>
                      <span>{formatCurrency(purchaseOrderTotal(order.items))}</span>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <GitBranch className="h-4 w-4 text-muted-foreground" /> Approval Timeline
                  </h4>
                  <div className="space-y-0">
                    {order.timeline.map((step, idx) => {
                      const done = step.date !== null;
                      const isCurrent = idx === currentStepIndex;
                      const isLast = idx === order.timeline.length - 1;
                      return (
                        <div key={step.stage} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <span
                              className={`h-3 w-3 rounded-full shrink-0 ${
                                done
                                  ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                                  : isCurrent
                                    ? 'bg-amber-500 ring-4 ring-amber-500/20 animate-pulse'
                                    : 'bg-muted-foreground/30'
                              }`}
                            />
                            {!isLast && <span className="w-0.5 flex-1 min-h-[28px] bg-border" />}
                          </div>
                          <div className={`pb-4 ${isLast ? '' : ''}`}>
                            <p className="text-sm font-medium leading-none">{step.stage}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {step.actor} · {done ? format(new Date(step.date as string), 'dd MMM yyyy') : 'Pending'}
                            </p>
                            {step.note && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.note}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="shrink-0 border-t bg-background px-5 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={isLocked || action.isPending}
                  onClick={() => run('approve', 'Purchase order approved')}
                >
                  {action.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={isLocked || action.isPending}
                  onClick={() => run('reject', 'Purchase order rejected')}
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={isLocked || action.isPending}
                  onClick={() => run('request_changes', 'Changes requested')}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Changes
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                  disabled={action.isPending}
                  onClick={() => run('duplicate', 'Purchase order duplicated')}
                >
                  <Copy className="h-3.5 w-3.5" /> Duplicate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                  onClick={() => toast.success('PDF export started (demo)')}
                >
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
