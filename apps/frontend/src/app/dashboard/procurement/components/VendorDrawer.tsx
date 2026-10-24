'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Button, Badge, Progress, ScrollArea, Sheet, SheetContent, SheetTitle, Skeleton } from '@sitepilot/ui';
import {
  Star, MapPin, Phone, Mail, User, ShoppingCart, FileText, Sparkles, Package, X, Pencil, PauseCircle, PlayCircle,
} from 'lucide-react';
import { usePurchaseOrders, useSetVendorActive } from '@/hooks/api/use-procurement';
import { getApiErrorMessage } from '@/lib/api/errors';
import { useCan } from '@/hooks/api/use-access';
import type { Vendor } from '@/features/procurement/types';
import { PurchaseOrderFormDialog } from '@/features/procurement/components/PurchaseOrderFormDialog';
import { VendorFormDialog } from '@/features/procurement/components/VendorFormDialog';
import { formatCurrency } from './procurement-format';
import { getVendorAvatarColor, getVendorInitials } from './VendorCard';
import { StatusBadge } from './StatusBadge';
import { RecordHistory } from '@/features/audit/components/RecordHistory';

const RECENT_ORDER_LIMIT = 5;

function percentColor(value: number): string {
  if (value >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (value >= 75) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null }): React.ReactElement {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

function MetricBar({ label, displayValue, percent }: { label: string; displayValue: string; percent: number }): React.ReactElement {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-semibold ${percentColor(percent)}`}>{displayValue}</span>
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  );
}

interface VendorDrawerProps {
  vendor: Vendor | null;
  open: boolean;
  onClose: () => void;
  onOpenOrder: (orderId: string) => void;
}

export function VendorDrawer({ vendor, open, onClose, onOpenOrder }: VendorDrawerProps): React.ReactElement {
  // Shares the page's all-orders cache instead of fetching per vendor.
  const { data: orders = [], isLoading: isLoadingOrders } = usePurchaseOrders();
  const setVendorActive = useSetVendorActive();
  const can = useCan();
  const [editOpen, setEditOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const recentOrders = orders.filter((order) => order.vendor?.id === vendor?.id).slice(0, RECENT_ORDER_LIMIT);
  const location = [vendor?.city, vendor?.state].filter(Boolean).join(', ');

  async function toggleActive(): Promise<void> {
    if (!vendor) return;
    const activate = vendor.status !== 'ACTIVE';
    try {
      await setVendorActive.mutateAsync({ id: vendor.id, active: activate });
      toast.success(activate ? `${vendor.name} reactivated` : `${vendor.name} deactivated`, {
        description: activate ? undefined : 'Existing orders continue; new orders and RFQs are blocked.',
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't update the vendor. Try again."));
    }
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[460px] p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        {vendor && (
          <>
            <SheetTitle className="sr-only">Vendor Profile - {vendor.name}</SheetTitle>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 z-20 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="shrink-0 border-b bg-muted/30 px-5 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${getVendorAvatarColor(vendor.id)} text-white text-lg font-bold shrink-0`}>
                  {getVendorInitials(vendor.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-tight truncate">{vendor.name}</h3>
                  <p className="text-xs text-muted-foreground">{vendor.code}</p>
                  {location && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {location}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge kind="vendor" value={vendor.status} />
                <span className="flex items-center gap-1 text-xs font-semibold">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {vendor.rating.toFixed(1)}
                </span>
                {vendor.categories.map((category) => (
                  <Badge key={category} variant="secondary" className="text-xs">{category}</Badge>
                ))}
              </div>
            </div>

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5 space-y-4">
                <div className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <User className="h-4 w-4 text-muted-foreground" /> Contact & Terms
                  </h4>
                  <div className="space-y-3">
                    <InfoRow icon={User} label="Contact Person" value={vendor.contactPerson} />
                    <InfoRow icon={Phone} label="Phone" value={vendor.phone} />
                    <InfoRow icon={Mail} label="Email" value={vendor.email} />
                    <InfoRow icon={FileText} label="GSTIN" value={vendor.gstNumber} />
                    <InfoRow icon={ShoppingCart} label="Payment Terms" value={vendor.paymentTerms} />
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <Star className="h-4 w-4 text-muted-foreground" /> Performance
                  </h4>
                  <div className="space-y-3">
                    {vendor.stats.onTimeDeliveryPercent === null ? (
                      <p className="text-xs text-muted-foreground">On-time rate appears after the first received delivery.</p>
                    ) : (
                      <MetricBar
                        label={`On-Time Delivery (${vendor.stats.deliveriesReceived} received)`}
                        displayValue={`${vendor.stats.onTimeDeliveryPercent}%`}
                        percent={vendor.stats.onTimeDeliveryPercent}
                      />
                    )}
                    <MetricBar label="Delivery Accuracy" displayValue={`${vendor.deliveryAccuracy}%`} percent={vendor.deliveryAccuracy} />
                    <MetricBar
                      label="Quality Rating"
                      displayValue={`${vendor.qualityRating.toFixed(1)}/5`}
                      percent={(vendor.qualityRating / 5) * 100}
                    />
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <FileText className="h-4 w-4 text-muted-foreground" /> Account
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Approved Spend</p>
                      <p className="text-lg font-bold">{formatCurrency(vendor.stats.totalSpend)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Orders · Projects</p>
                      <p className="text-lg font-bold">{vendor.stats.totalOrders} · {vendor.stats.projectCount}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Outstanding</p>
                      <p className="text-sm font-semibold">{formatCurrency(vendor.outstandingBalance)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Last Order</p>
                      <p className="text-sm font-semibold">
                        {vendor.stats.lastOrderDate ? format(new Date(vendor.stats.lastOrderDate), 'dd MMM yyyy') : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <Package className="h-4 w-4 text-muted-foreground" /> Recent Purchase Orders
                  </h4>
                  {isLoadingOrders ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-9 w-full" />)}</div>
                  ) : recentOrders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No purchase orders with this vendor yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {recentOrders.map((po) => (
                        <button
                          key={po.id}
                          type="button"
                          onClick={() => onOpenOrder(po.id)}
                          className="flex w-full items-center justify-between gap-2 rounded-md px-1 py-1.5 text-left transition-colors hover:bg-muted/50"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{po.poNumber}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {po.category} · {format(new Date(po.requestedDate), 'dd MMM yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold whitespace-nowrap">{formatCurrency(po.amount)}</span>
                            <StatusBadge kind="approval" value={po.status} showIcon={false} />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {vendor.aiRecommendation && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-xs font-semibold text-primary">AI Recommendation</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{vendor.aiRecommendation}</p>
                  </div>
                )}
                <RecordHistory entityType="vendor" entityId={vendor.id} />
              </div>
            </ScrollArea>

            {(can('po.create') || can('vendor.manage')) && (
            <div className="shrink-0 border-t bg-background px-5 py-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {can('po.create') && (
                  <Button size="sm" className="gap-1.5" disabled={vendor.status !== 'ACTIVE'} onClick={() => setOrderOpen(true)}>
                    <ShoppingCart className="h-3.5 w-3.5" /> New PO
                  </Button>
                )}
                {can('vendor.manage') && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setEditOpen(true)}>
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                )}
              </div>
              {can('vendor.manage') && (
              <Button
                size="sm"
                variant="ghost"
                className="w-full gap-1.5 text-muted-foreground"
                disabled={setVendorActive.isPending}
                onClick={toggleActive}
              >
                {vendor.status === 'ACTIVE'
                  ? <><PauseCircle className="h-3.5 w-3.5" /> Deactivate vendor</>
                  : <><PlayCircle className="h-3.5 w-3.5" /> Reactivate vendor</>}
              </Button>
              )}
            </div>
            )}

            <VendorFormDialog open={editOpen} onOpenChange={setEditOpen} vendor={vendor} />
            <PurchaseOrderFormDialog open={orderOpen} onOpenChange={setOrderOpen} vendor={vendor} onSaved={onOpenOrder} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
