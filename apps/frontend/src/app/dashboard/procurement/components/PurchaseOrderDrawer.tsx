'use client';

import React, { useState } from 'react';
import { Button, Progress, ScrollArea, Sheet, SheetContent, SheetTitle, Skeleton } from '@sitepilot/ui';
import { X, MapPin, ClipboardList, Package, GitBranch, Truck, MessageSquareWarning, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { usePurchaseOrder } from '@/hooks/api/use-procurement';
import { orderBreakdown } from '@/features/procurement/utils/pricing';
import type { Delivery } from '@/features/procurement/types';
import { ReceiveGoodsDialog, type ReceiveGoodsRequest } from '@/features/procurement/components/ReceiveGoodsDialog';
import { StatusBadge } from './StatusBadge';
import { formatCurrency } from './procurement-format';
import { PurchaseOrderActions } from './PurchaseOrderActions';
import { PurchaseOrderDeliveries } from './PurchaseOrderDeliveries';
import { RecordHistory } from '@/features/audit/components/RecordHistory';

interface PurchaseOrderDrawerProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  onOpenOrder: (orderId: string) => void;
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium mt-0.5">{children}</div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }): React.ReactElement {
  return (
    <section className="rounded-xl border bg-card p-4">
      <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </h4>
      {children}
    </section>
  );
}

const formatDay = (value: string): string => format(new Date(value), 'dd MMM yyyy');

export function PurchaseOrderDrawer({ orderId, open, onClose, onOpenOrder }: PurchaseOrderDrawerProps): React.ReactElement {
  const { data: order, isLoading, isError, refetch } = usePurchaseOrder(open ? orderId : null);
  const [receiveRequest, setReceiveRequest] = useState<ReceiveGoodsRequest | null>(null);
  const breakdown = order ? orderBreakdown(order.items) : null;
  const sendsBack = order?.reviewNote && (order.status === 'CHANGES_REQUESTED' || order.status === 'REJECTED');

  function openReceive(delivery?: Delivery): void {
    if (order) setReceiveRequest({ order, delivery });
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        <SheetTitle className="sr-only">{order ? `Purchase Order ${order.poNumber}` : 'Purchase Order'}</SheetTitle>
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {isLoading && (
          <div className="p-5 space-y-4">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-64" />
            {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32 w-full rounded-xl" />)}
          </div>
        )}

        {isError && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-destructive/60" />
            <p className="text-sm font-medium">Unable to load this purchase order.</p>
            <p className="text-xs text-muted-foreground">It may have been removed, or the connection dropped.</p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        {order && breakdown && (
          <>
            <div className="shrink-0 border-b bg-muted/30 px-5 py-4">
              <p className="text-xl font-bold tracking-tight">{order.poNumber}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {order.vendor?.name ?? 'No vendor'} · {order.project?.name ?? 'No project'}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <StatusBadge kind="approval" value={order.status} />
                <StatusBadge kind="priority" value={order.priority} />
                {order.status === 'APPROVED' && (
                  <StatusBadge kind="delivery" value={order.isOverdue ? 'DELAYED' : order.deliveryStatus} />
                )}
                {order.sourceRfq && <span className="text-xs text-muted-foreground">from {order.sourceRfq.rfqNumber}</span>}
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5 space-y-4">
                {sendsBack && (
                  <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/40 dark:bg-amber-950/20">
                    <MessageSquareWarning className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold">{order.reviewedBy?.name ?? 'Reviewer'} {order.status === 'REJECTED' ? 'rejected this order' : 'requested changes'}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{order.reviewNote}</p>
                    </div>
                  </div>
                )}

                <Section icon={ClipboardList} title="Details">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <DetailRow label="Requested By">{order.requestedBy?.name ?? '—'}</DetailRow>
                    <DetailRow label="Reviewed By">{order.reviewedBy?.name ?? 'Not reviewed yet'}</DetailRow>
                    <DetailRow label="Requested Date">{formatDay(order.requestedDate)}</DetailRow>
                    <DetailRow label="Expected Delivery">{formatDay(order.expectedDelivery)}</DetailRow>
                    <DetailRow label="Category">{order.category}</DetailRow>
                    <DetailRow label="Order Value">{formatCurrency(order.amount)}</DetailRow>
                  </div>
                  {order.notes && <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{order.notes}</p>}
                </Section>

                {order.deliveryAddress && (
                  <Section icon={MapPin} title="Delivery Address">
                    <p className="text-sm text-muted-foreground leading-relaxed">{order.deliveryAddress}</p>
                  </Section>
                )}

                <Section icon={Package} title="Line Items">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="text-left py-2 pr-2 font-medium">Description</th>
                          <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Qty</th>
                          <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Rate</th>
                          <th className="text-right py-2 px-2 font-medium whitespace-nowrap">GST</th>
                          <th className="text-right py-2 px-2 font-medium whitespace-nowrap">Disc</th>
                          <th className="text-right py-2 pl-2 font-medium whitespace-nowrap">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item) => (
                          <tr key={item.id} className="border-b last:border-0">
                            <td className="py-2 pr-2">
                              <p className="font-medium text-foreground">{item.description}</p>
                              {item.material && <p className="text-muted-foreground">Stock item · {item.material.name}</p>}
                              {order.status === 'APPROVED' && (
                                <p className="text-muted-foreground">{item.receivedQuantity} of {item.quantity} {item.unit} received</p>
                              )}
                            </td>
                            <td className="text-right py-2 px-2 whitespace-nowrap">{item.quantity} {item.unit}</td>
                            <td className="text-right py-2 px-2 whitespace-nowrap">{formatCurrency(item.rate)}</td>
                            <td className="text-right py-2 px-2 whitespace-nowrap">{item.taxPercent}%</td>
                            <td className="text-right py-2 px-2 whitespace-nowrap">{item.discountPercent}%</td>
                            <td className="text-right py-2 pl-2 font-semibold whitespace-nowrap">{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(breakdown.subtotal)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Discount</span><span>-{formatCurrency(breakdown.discount)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>GST</span><span>+{formatCurrency(breakdown.tax)}</span></div>
                    <div className="flex justify-between pt-2 border-t font-bold text-base"><span>Grand Total</span><span>{formatCurrency(order.amount)}</span></div>
                  </div>
                </Section>

                {order.status === 'APPROVED' && (
                  <Section icon={Truck} title="Deliveries">
                    <div className="mb-3 flex items-center gap-3">
                      <Progress value={order.receivedPercent} className="h-1.5 flex-1" />
                      <span className="text-xs font-semibold">{order.receivedPercent}% received</span>
                    </div>
                    <PurchaseOrderDeliveries order={order} onReceive={openReceive} />
                  </Section>
                )}

                <Section icon={GitBranch} title="Activity">
                  {order.timeline.map((step, index) => (
                    <div key={step.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="h-3 w-3 rounded-full shrink-0 bg-emerald-500 ring-4 ring-emerald-500/20" />
                        {index < order.timeline.length - 1 && <span className="w-0.5 flex-1 min-h-[28px] bg-border" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium leading-none">{step.stage}</p>
                        <p className="text-xs text-muted-foreground mt-1">{step.actor} · {formatDay(step.date)}</p>
                        {step.note && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{step.note}</p>}
                      </div>
                    </div>
                  ))}
                </Section>
                <RecordHistory entityType="purchase_order" entityId={order.id} />
              </div>
            </ScrollArea>

            <PurchaseOrderActions order={order} onReceive={() => openReceive()} onOpenOrder={onOpenOrder} />
            <ReceiveGoodsDialog request={receiveRequest} onClose={() => setReceiveRequest(null)} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
