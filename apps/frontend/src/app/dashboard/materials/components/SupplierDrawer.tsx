'use client';

import React from 'react';
import {
  Button, Badge, Progress, ScrollArea,
  Sheet, SheetContent, SheetTitle,
} from '@sitepilot/ui';
import {
  X, Star, User, Phone, Mail, Clock, Truck, ShoppingCart, Package, IndianRupee,
} from 'lucide-react';
import type { MaterialSupplier } from '@/hooks/api/use-materials';
import { formatCompactINR, formatCurrency } from './materials-format';
import { getInitials } from '@/lib/utils';

interface SupplierDrawerProps {
  supplier: MaterialSupplier | null;
  open: boolean;
  onClose: () => void;
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

export function SupplierDrawer({ supplier, open, onClose }: SupplierDrawerProps): React.ReactElement {
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[460px] p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        {supplier && (
          <>
            <SheetTitle className="sr-only">Supplier - {supplier.name}</SheetTitle>
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
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary text-lg font-bold shrink-0">
                  {getInitials(supplier.name)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold leading-tight truncate">{supplier.name}</h3>
                  {supplier.contactName && (
                    <p className="text-xs text-muted-foreground">{supplier.contactName}</p>
                  )}
                  <div className="mt-1 flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-semibold">{supplier.rating.toFixed(1)}</span>
                    <Badge variant="secondary" className="ml-2 text-xs">{supplier.materialCount} materials</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-5 space-y-4">
                <div className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <User className="h-4 w-4 text-muted-foreground" /> Contact
                  </h4>
                  <div className="space-y-3">
                    <InfoRow icon={User} label="Contact Person" value={supplier.contactName ?? '-'} />
                    <InfoRow icon={Phone} label="Phone" value={supplier.phone ?? '-'} />
                    <InfoRow icon={Mail} label="Email" value={supplier.email ?? '-'} />
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                    <Star className="h-4 w-4 text-muted-foreground" /> Performance
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">On-Time Delivery</span>
                        <span className="text-xs font-semibold">{supplier.onTimeRate}%</span>
                      </div>
                      <Progress value={supplier.onTimeRate} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">Quality Rating</span>
                        <span className="text-xs font-semibold">{supplier.rating.toFixed(1)}/5</span>
                      </div>
                      <Progress value={(supplier.rating / 5) * 100} className="h-1.5" />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Lead Time
                      </span>
                      <span className="text-xs font-semibold">{supplier.leadTimeDays} days</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <IndianRupee className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-sm font-bold mt-1">{formatCompactINR(supplier.totalSpend)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Spend</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <ShoppingCart className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-sm font-bold mt-1">{supplier.openPurchaseOrders}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Open POs</p>
                  </div>
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <Package className="h-4 w-4 mx-auto text-muted-foreground" />
                    <p className="text-sm font-bold mt-1">{formatCompactINR(supplier.inventoryValue)}</p>
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Inventory</p>
                  </div>
                </div>

                {supplier.suppliedMaterials.length > 0 && (
                  <div className="rounded-xl border bg-card p-4">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                      <Package className="h-4 w-4 text-muted-foreground" /> Supplied Materials
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {supplier.suppliedMaterials.map((material) => (
                        <Badge key={material} variant="secondary" className="text-xs">{material}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="shrink-0 border-t bg-background px-5 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total spend {formatCurrency(supplier.totalSpend)}</span>
              <Button size="sm" variant="outline" onClick={onClose} className="gap-1.5">
                <X className="h-3.5 w-3.5" /> Close
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
