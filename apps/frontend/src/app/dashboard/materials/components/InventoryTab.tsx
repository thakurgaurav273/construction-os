'use client';

import React, { useMemo } from 'react';
import { Skeleton, Badge, Button } from '@sitepilot/ui';
import { Warehouse, Package, AlertTriangle } from 'lucide-react';
import { useInventoryItems, type InventoryItemListItem } from '@/hooks/api/use-inventory';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNumber } from '@/lib/utils';
import { formatCompactINR, getStatusMeta } from './materials-format';
import { MaterialStatusBadge } from './MaterialStatusBadge';

interface WarehouseGroup {
  id: string;
  name: string;
  items: InventoryItemListItem[];
  inventoryValue: number;
}

interface InventoryTabProps {
  onSelect: (materialId: string) => void;
}

function groupByWarehouse(items: InventoryItemListItem[]): WarehouseGroup[] {
  const map = new Map<string, WarehouseGroup>();
  for (const item of items) {
    const group = map.get(item.warehouseId) ?? { id: item.warehouseId, name: item.warehouseName, items: [], inventoryValue: 0 };
    group.items.push(item);
    group.inventoryValue += item.value;
    map.set(item.warehouseId, group);
  }
  return Array.from(map.values()).sort((a, b) => b.inventoryValue - a.inventoryValue);
}

function StockCard({ item, onSelect }: { item: InventoryItemListItem; onSelect: (id: string) => void }): React.ReactElement {
  const meta = getStatusMeta(item.status);
  return (
    <button
      type="button"
      onClick={() => onSelect(item.materialId)}
      className="text-left rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/40 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-semibold truncate group-hover:text-primary transition-colors">{item.materialName}</p>
          <p className="text-xs text-muted-foreground">{item.sku}</p>
        </div>
        <MaterialStatusBadge status={item.status} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className={`text-base font-bold ${meta.accentClass}`}>{formatNumber(item.available)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Available</p>
        </div>
        <div>
          <p className="text-base font-bold">{formatNumber(item.reserved)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reserved</p>
        </div>
        <div>
          <p className="text-base font-bold">{formatNumber(item.incoming)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Incoming</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Reorder at {formatNumber(item.reorderLevel)} {item.unit}</span>
        <span className="font-medium text-foreground">{formatCompactINR(item.value)}</span>
      </div>
    </button>
  );
}

export function InventoryTab({ onSelect }: InventoryTabProps): React.ReactElement {
  const { data, isLoading, isError, refetch } = useInventoryItems({ limit: 100 });

  const groups = useMemo(() => groupByWarehouse(data?.items ?? []), [data]);

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load inventory"
        description="Something went wrong while fetching warehouse stock. Please try again."
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-8 w-56 rounded-md" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-40 w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={Warehouse}
        title="No inventory yet"
        description="Stock appears here, grouped by store, once goods are received or counted into a store."
      />
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.id} className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Warehouse className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold leading-tight">{group.name}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" /> {group.items.length} materials
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {formatCompactINR(group.inventoryValue)} on hand
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map((item) => (
              <StockCard key={item.id} item={item} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
