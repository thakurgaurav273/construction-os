'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  Button, Badge, ScrollArea, Skeleton,
  Sheet, SheetContent, SheetTitle,
} from '@sitepilot/ui';
import {
  Package, X, Star, Phone, Mail, User, Truck, Clock, MapPin,
  ArrowDownLeft, ArrowUpRight, SlidersHorizontal, AlertTriangle, Lock, FolderKanban,
} from 'lucide-react';
import {
  useInventoryItem, type InventoryItemDetail, type InventoryTransactionType,
} from '@/hooks/api/use-inventory';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import {
  formatCurrency, formatCompactINR, getTxMeta, txSign, formatWarehouseType,
} from './inventory-format';
import { InventoryStatusBadge } from './InventoryStatusBadge';
import { AdjustmentDialog } from './AdjustmentDialog';
import { Can } from '@/components/shared/Can';
import { ReorderButton } from '@/features/procurement/components/ReorderButton';

interface InventoryItemDrawerProps {
  itemId: string | null;
  open: boolean;
  onClose: () => void;
}

const TX_ICONS: Record<InventoryTransactionType, React.ComponentType<{ className?: string }>> = {
  RECEIVE: ArrowDownLeft,
  RETURN: ArrowDownLeft,
  TRANSFER_IN: ArrowDownLeft,
  ISSUE: ArrowUpRight,
  CONSUMPTION: ArrowUpRight,
  TRANSFER_OUT: ArrowUpRight,
  DAMAGE: AlertTriangle,
  ADJUSTMENT: SlidersHorizontal,
};

interface StatProps {
  label: string;
  value: string;
  accentClass?: string;
}

function Stat({ label, value, accentClass = '' }: StatProps): React.ReactElement {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${accentClass}`}>{value}</p>
    </div>
  );
}

function DrawerSkeleton(): React.ReactElement {
  return (
    <div className="p-5 space-y-4">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

function ItemDrawerBody({ item }: { item: InventoryItemDetail }): React.ReactElement {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const recentTransactions = item.transactions.slice(0, 8);

  return (
    <>
      {/* Hero */}
      <div className="shrink-0 border-b bg-muted/30 px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border bg-muted/50 shrink-0">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-tight truncate">{item.materialName}</h3>
            <p className="text-xs text-muted-foreground">{item.sku}</p>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <InventoryStatusBadge status={item.status} />
              {item.category && (
                <Badge variant="secondary" className="text-xs">{item.category.name}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-5 space-y-5">
          {/* Stock stats */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Available" value={`${formatNumber(item.available)} ${item.unit}`} accentClass="text-primary" />
            <Stat label="Reserved" value={`${formatNumber(item.reserved)} ${item.unit}`} />
            <Stat label="Damaged" value={`${formatNumber(item.damaged)} ${item.unit}`} />
            <Stat label="Incoming" value={`${formatNumber(item.incoming)} ${item.unit}`} />
            <Stat label="Unit Cost" value={formatCurrency(item.unitCost)} />
            <Stat label="Stock Value" value={formatCompactINR(item.value)} />
          </div>

          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" /> Stored in{' '}
              <span className="font-medium text-foreground">{item.warehouse.name}</span>
              <span className="text-xs">({formatWarehouseType(item.warehouse.type)})</span>
            </div>
            {item.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Location{' '}
                <span className="font-medium text-foreground">
                  {item.location.code}
                  {item.location.zone ? ` · ${item.location.zone}` : ''}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Reorder level{' '}
              <span className="font-medium text-foreground">{formatNumber(item.reorderLevel)} {item.unit}</span>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="rounded-xl border bg-card p-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
              <ArrowDownLeft className="h-4 w-4 text-muted-foreground" /> Recent Transactions
            </h4>
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-muted-foreground">No transactions recorded yet.</p>
            ) : (
              <div className="space-y-1">
                {recentTransactions.map((tx) => {
                  const meta = getTxMeta(tx.type);
                  const Icon = TX_ICONS[tx.type];
                  return (
                    <div key={tx.id} className="flex items-center gap-3 py-1.5 border-b border-dashed last:border-0">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.iconBgClass} shrink-0`}>
                        <Icon className={`h-4 w-4 ${meta.accentClass}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{meta.label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.project?.name ?? tx.reference ?? tx.note ?? '-'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${meta.accentClass}`}>
                          {txSign(tx.type, tx.quantity)}{formatNumber(Math.abs(tx.quantity))} {item.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(tx.occurredAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reservations */}
          {item.reservations.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Lock className="h-4 w-4 text-muted-foreground" /> Active Reservations
              </h4>
              <div className="space-y-2">
                {item.reservations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 border-b border-dashed last:border-0 py-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.project?.name ?? 'Unassigned'}</p>
                      {r.note && <p className="text-xs text-muted-foreground truncate">{r.note}</p>}
                    </div>
                    <span className="text-sm font-semibold shrink-0">{formatNumber(r.quantity)} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Consumption by project */}
          {item.consumption.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <FolderKanban className="h-4 w-4 text-muted-foreground" /> Consumption by Project
              </h4>
              <div className="space-y-2">
                {item.consumption.map((c) => (
                  <div key={c.projectId} className="flex items-center justify-between gap-2 border-b border-dashed last:border-0 py-1.5">
                    <p className="text-sm font-medium truncate">{c.projectName}</p>
                    <span className="text-sm font-semibold shrink-0">{formatNumber(c.quantity)} {item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supplier */}
          {item.supplier && (
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <User className="h-4 w-4 text-muted-foreground" /> Supplier
              </h4>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">{item.supplier.name}</p>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-semibold">{item.supplier.rating.toFixed(1)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                {item.supplier.contactName && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> {item.supplier.contactName}
                  </div>
                )}
                {item.supplier.phone && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {item.supplier.phone}
                  </div>
                )}
                {item.supplier.email && (
                  <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{item.supplier.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {item.supplier.leadTimeDays}d lead time
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" /> {item.supplier.onTimeRate}% on-time
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="shrink-0 border-t bg-background px-5 py-3 grid grid-cols-2 gap-2">
        <Can permission="inventory.adjust" fallback={<span />}>
          <Button size="sm" className="gap-1.5 w-full" onClick={() => setAdjustOpen(true)}>
            <SlidersHorizontal className="h-3.5 w-3.5" /> Adjust Stock
          </Button>
        </Can>
        <ReorderButton materialId={item.materialId} warehouseId={item.warehouse.id} className="w-full" />
      </div>

      <AdjustmentDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        materialId={item.materialId}
        warehouseId={item.warehouse.id}
        materialName={item.materialName}
        currentQuantity={item.quantity}
        unit={item.unit}
      />
    </>
  );
}

export function InventoryItemDrawer({ itemId, open, onClose }: InventoryItemDrawerProps): React.ReactElement {
  const { data: item, isLoading, isError } = useInventoryItem(itemId ?? '');

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        <SheetTitle className="sr-only">Inventory Item Details</SheetTitle>
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
            <p className="text-sm text-muted-foreground">Unable to load this item. Please try again.</p>
          </div>
        ) : isLoading || !item ? (
          <DrawerSkeleton />
        ) : (
          <ItemDrawerBody item={item} />
        )}
      </SheetContent>
    </Sheet>
  );
}
