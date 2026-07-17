'use client';

import React, { useMemo } from 'react';
import { Skeleton, Badge, Button } from '@sitepilot/ui';
import { Warehouse, Package, AlertTriangle } from 'lucide-react';
import {
  useMaterials, type MaterialListItem,
} from '@/hooks/api/use-materials';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNumber } from '@/lib/utils';
import { formatCompactINR, getStatusMeta } from './materials-format';
import { MaterialStatusBadge } from './MaterialStatusBadge';

interface WarehouseGroup {
  name: string;
  materials: MaterialListItem[];
  inventoryValue: number;
}

const UNASSIGNED = 'Unassigned';

interface InventoryTabProps {
  onSelect: (materialId: string) => void;
}

function groupByWarehouse(items: MaterialListItem[]): WarehouseGroup[] {
  const map = new Map<string, WarehouseGroup>();
  for (const material of items) {
    const key = material.warehouse ?? UNASSIGNED;
    const group = map.get(key) ?? { name: key, materials: [], inventoryValue: 0 };
    group.materials.push(material);
    group.inventoryValue += material.stockValue;
    map.set(key, group);
  }
  return Array.from(map.values()).sort((a, b) => b.inventoryValue - a.inventoryValue);
}

function StockCard({ material, onSelect }: { material: MaterialListItem; onSelect: (id: string) => void }): React.ReactElement {
  const meta = getStatusMeta(material.status);
  return (
    <button
      type="button"
      onClick={() => onSelect(material.id)}
      className="text-left rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/40 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <p className="font-semibold truncate group-hover:text-primary transition-colors">{material.name}</p>
          <p className="text-xs text-muted-foreground">{material.sku}</p>
        </div>
        <MaterialStatusBadge status={material.status} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className={`text-base font-bold ${meta.accentClass}`}>{formatNumber(material.available)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Available</p>
        </div>
        <div>
          <p className="text-base font-bold">{formatNumber(material.reserved)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reserved</p>
        </div>
        <div>
          <p className="text-base font-bold">{formatNumber(material.incoming)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Incoming</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Min {formatNumber(material.minStock)} {material.unit}</span>
        <span className="font-medium text-foreground">{formatCompactINR(material.stockValue)}</span>
      </div>
    </button>
  );
}

export function InventoryTab({ onSelect }: InventoryTabProps): React.ReactElement {
  const { data, isLoading, isError, refetch } = useMaterials({ limit: 100, sort: 'name', order: 'asc' });

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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        description="Once materials are added and stocked, warehouse-level inventory will appear here grouped by location."
      />
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.name} className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Warehouse className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold leading-tight">{group.name}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Package className="h-3 w-3" /> {group.materials.length} materials
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm">
              {formatCompactINR(group.inventoryValue)} on hand
            </Badge>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {group.materials.map((material) => (
              <StockCard key={material.id} material={material} onSelect={onSelect} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
