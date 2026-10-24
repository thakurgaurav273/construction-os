'use client';

import React from 'react';
import {
  Badge, Progress, ScrollArea, Skeleton,
  Sheet, SheetContent, SheetTitle,
} from '@sitepilot/ui';
import {
  Warehouse, X, MapPin, User, Package, AlertTriangle,
  ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';
import {
  useWarehouse, type WarehouseDetail, type WarehouseTransaction,
} from '@/hooks/api/use-inventory';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import { formatCompactINR, formatWarehouseType, getTxMeta } from './inventory-format';
import { InventoryStatusBadge } from './InventoryStatusBadge';
import { WarehouseDrawerActions } from './WarehouseDrawerActions';
import { WarehouseLocationsCard } from '@/features/inventory/components/WarehouseLocationsCard';
import { useCan } from '@/hooks/api/use-access';
import { RecordHistory } from '@/features/audit/components/RecordHistory';

interface WarehouseDrawerProps {
  warehouseId: string | null;
  open: boolean;
  onClose: () => void;
}

function Stat({ label, value, accentClass = '' }: { label: string; value: string; accentClass?: string }): React.ReactElement {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${accentClass}`}>{value}</p>
    </div>
  );
}

function MovementList({
  title,
  icon: Icon,
  transactions,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  transactions: WarehouseTransaction[];
}): React.ReactElement {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" /> {title}
      </h4>
      {transactions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No recent movement.</p>
      ) : (
        <div className="space-y-1.5">
          {transactions.map((tx) => {
            const meta = getTxMeta(tx.type);
            return (
              <div key={tx.id} className="flex items-center justify-between gap-2 border-b border-dashed last:border-0 py-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{tx.materialName}</p>
                  <p className="text-xs text-muted-foreground">{meta.label} · {formatRelativeTime(tx.occurredAt)}</p>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${meta.accentClass}`}>
                  {formatNumber(tx.quantity)} {tx.unit}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WarehouseDrawerBody({ warehouse, onClose }: { warehouse: WarehouseDetail; onClose: () => void }): React.ReactElement {
  const { kpis } = warehouse;
  const canManage = useCan()('warehouse.manage');
  return (
    <>
      {/* Hero */}
      <div className="shrink-0 border-b bg-muted/30 px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Warehouse className="h-6 w-6 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-tight truncate">{warehouse.name}</h3>
            <p className="text-xs text-muted-foreground">{warehouse.code}</p>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{formatWarehouseType(warehouse.type)}</Badge>
              {warehouse.projectName && (
                <Badge variant="outline" className="text-xs">{warehouse.projectName}</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
          {warehouse.city && (
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {warehouse.address ?? warehouse.city}</span>
          )}
          {warehouse.manager && (
            <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {warehouse.manager}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Items" value={formatNumber(kpis.itemCount)} />
            <Stat label="Total Qty" value={formatNumber(kpis.totalQuantity)} />
            <Stat label="Inv. Value" value={formatCompactINR(kpis.inventoryValue)} accentClass="text-primary" />
            <Stat label="Reserved" value={formatCompactINR(kpis.reservedValue)} />
            <Stat label="Low Stock" value={formatNumber(kpis.lowStockCount)} accentClass={kpis.lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : ''} />
            <Stat label="Utilization" value={kpis.utilization !== null ? `${kpis.utilization}%` : '-'} />
          </div>

          {kpis.utilization !== null && (
            <Progress value={kpis.utilization} className="h-2" />
          )}

          <WarehouseLocationsCard warehouse={warehouse} canManage={canManage} />

          {/* Items */}
          <div className="rounded-xl border bg-card p-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
              <Package className="h-4 w-4 text-muted-foreground" /> Stock ({warehouse.items.length})
            </h4>
            {warehouse.items.length === 0 ? (
              <p className="text-xs text-muted-foreground">No stock held at this warehouse.</p>
            ) : (
              <div className="space-y-1.5">
                {warehouse.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 border-b border-dashed last:border-0 py-1.5">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.materialName}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold">{formatNumber(item.available)} {item.unit}</span>
                      <InventoryStatusBadge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4">
            <MovementList title="Recent Inbound" icon={ArrowDownLeft} transactions={warehouse.inbound} />
            <MovementList title="Recent Outbound" icon={ArrowUpRight} transactions={warehouse.outbound} />
          </div>
          <RecordHistory entityType="warehouse" entityId={warehouse.id} />
        </div>
      </ScrollArea>
      {canManage && <WarehouseDrawerActions warehouse={warehouse} onArchived={onClose} />}
    </>
  );
}

export function WarehouseDrawer({ warehouseId, open, onClose }: WarehouseDrawerProps): React.ReactElement {
  const { data: warehouse, isLoading, isError } = useWarehouse(warehouseId ?? '');

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[520px] p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        <SheetTitle className="sr-only">Warehouse Details</SheetTitle>
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
            <p className="text-sm text-muted-foreground">Unable to load this warehouse. Please try again.</p>
          </div>
        ) : isLoading || !warehouse ? (
          <div className="p-5 space-y-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : (
          <WarehouseDrawerBody warehouse={warehouse} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}
