'use client';

import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Button, Badge, Progress, ScrollArea,
  Sheet, SheetContent, SheetTitle,
} from '@sitepilot/ui';
import {
  Star, MapPin, Phone, Mail, User, ShoppingCart, FileText, Sparkles, Package, X,
} from 'lucide-react';
import { formatCurrency } from './procurement-format';
import { getVendorAvatarColor, getVendorInitials } from './VendorCard';
import { StatusBadge } from './StatusBadge';
import { usePurchaseOrders } from '@/hooks/api/use-procurement';
import type { Vendor } from '@/data/procurement-demo';

function barColor(value: number): string {
  if (value >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (value >= 75) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function scoreColor(score: number): string {
  if (score >= 85) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

interface InfoRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function InfoRow({ icon: Icon, label, value }: InfoRowProps): React.ReactElement {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{value}</p>
      </div>
    </div>
  );
}

interface MetricBarProps {
  label: string;
  displayValue: string;
  percent: number;
}

function MetricBar({ label, displayValue, percent }: MetricBarProps): React.ReactElement {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-semibold ${barColor(percent)}`}>{displayValue}</span>
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  );
}

interface VendorDrawerProps {
  vendor: Vendor | null;
  open: boolean;
  onClose: () => void;
}

export function VendorDrawer({ vendor, open, onClose }: VendorDrawerProps): React.ReactElement {
  const { data: allOrders } = usePurchaseOrders();
  const vendorOrders = useMemo(
    () => (vendor ? allOrders.filter((o) => o.vendorId === vendor.id).slice(0, 5) : []),
    [allOrders, vendor],
  );

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[460px] p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        {vendor && (
          <>
            <SheetTitle className="sr-only">Vendor Profile - {vendor.name}</SheetTitle>

            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 z-20 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Hero */}
            <div className="shrink-0 border-b bg-muted/30 px-5 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${getVendorAvatarColor(vendor.id)} text-white text-lg font-bold shrink-0`}>
                  {getVendorInitials(vendor.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-tight truncate">{vendor.name}</h3>
                  <p className="text-xs text-muted-foreground">{vendor.code}</p>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {vendor.city}, {vendor.state}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < Math.round(vendor.rating) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                  <span className="ml-1 text-xs font-semibold">{vendor.rating.toFixed(1)}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {vendor.categories.map((category) => (
                    <Badge key={category} variant="secondary" className="text-xs">{category}</Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Body */}
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
                    <InfoRow icon={FileText} label="GST Number" value={vendor.gstNumber} />
                    <InfoRow icon={ShoppingCart} label="Payment Terms" value={vendor.paymentTerms} />
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <Star className="h-4 w-4 text-muted-foreground" /> Performance
                  </h4>
                  <div className="space-y-3">
                    <MetricBar
                      label="Delivery Accuracy"
                      displayValue={`${vendor.deliveryAccuracy}%`}
                      percent={vendor.deliveryAccuracy}
                    />
                    <MetricBar
                      label="On-Time Delivery"
                      displayValue={`${vendor.onTimeDeliveryPercent}%`}
                      percent={vendor.onTimeDeliveryPercent}
                    />
                    <MetricBar
                      label="Quality Rating"
                      displayValue={`${vendor.qualityRating.toFixed(1)}/5`}
                      percent={(vendor.qualityRating / 5) * 100}
                    />
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground">Avg. Response Time</span>
                      <span className="text-xs font-semibold">{vendor.responseTimeHours}h</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <FileText className="h-4 w-4 text-muted-foreground" /> Account
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Performance Score</p>
                      <p className={`text-2xl font-bold ${scoreColor(vendor.performanceScore)}`}>
                        {vendor.performanceScore}
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">{vendor.totalOrders}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Outstanding</p>
                      <p className="text-sm font-semibold">{formatCurrency(vendor.outstandingBalance)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Last Order</p>
                      <p className="text-sm font-semibold">
                        {format(new Date(vendor.lastOrderDate), 'dd MMM yyyy')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <Package className="h-4 w-4 text-muted-foreground" /> Past Purchase Orders
                  </h4>
                  {vendorOrders.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No purchase orders on record yet.</p>
                  ) : (
                    <div className="space-y-1">
                      {vendorOrders.map((po) => (
                        <div
                          key={po.id}
                          className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{po.poNumber}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {po.category} · {format(new Date(po.requestedDate), 'dd MMM yyyy')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-sm font-semibold whitespace-nowrap">
                              {formatCurrency(po.amount)}
                            </span>
                            <StatusBadge kind="approval" value={po.approvalStatus} showIcon={false} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-xs font-semibold text-primary">AI Recommendation</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{vendor.aiRecommendation}</p>
                </div>
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="shrink-0 border-t bg-background px-5 py-3 grid grid-cols-2 gap-2">
              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => toast.success(`New purchase order for ${vendor.name} (demo)`)}
              >
                <ShoppingCart className="h-3.5 w-3.5" /> New PO
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => toast(`Showing orders for ${vendor.name} (demo)`)}
              >
                <FileText className="h-3.5 w-3.5" /> View Orders
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
