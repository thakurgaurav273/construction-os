'use client';

import React, { useState } from 'react';
import {
  Button, Skeleton,
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@sitepilot/ui';
import { Plus, SlidersHorizontal, Warehouse } from 'lucide-react';
import { useInventoryItems, useWarehouses } from '@/hooks/api/use-inventory';
import type { MaterialDetail } from '@/hooks/api/use-materials';
import { useCan } from '@/hooks/api/use-access';
import { formatNumber } from '@/lib/utils';
import { AdjustmentDialog } from '@/app/dashboard/inventory/components/AdjustmentDialog';

interface AdjustTarget {
  warehouseId: string;
  currentQuantity: number;
}

/** Where a material's stock physically sits. Store quantities always add up to the material total. */
export function MaterialStoresCard({ material }: { material: MaterialDetail }): React.ReactElement {
  const canAdjust = useCan()('inventory.adjust');
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null);
  const { data: stock, isLoading } = useInventoryItems({ materialId: material.id, limit: 100 });
  const { data: warehouses = [] } = useWarehouses();

  const stores = (stock?.items ?? []).filter((item) => item.quantity > 0 || item.reserved > 0);
  const storesWithoutStock = warehouses.filter((store) => !stores.some((item) => item.warehouseId === store.id));

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <Warehouse className="h-4 w-4 text-muted-foreground" /> Stock by Store
        </h4>
        {canAdjust && storesWithoutStock.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Record stock
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-xs">Opening stock or count at</DropdownMenuLabel>
              {storesWithoutStock.map((store) => (
                <DropdownMenuItem key={store.id} onSelect={() => setAdjustTarget({ warehouseId: store.id, currentQuantity: 0 })}>
                  {store.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      ) : stores.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No store holds this material yet. Stock arrives through goods receipts{canAdjust ? ' or a recorded count' : ''}.
        </p>
      ) : (
        <div className="divide-y divide-dashed">
          {stores.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{item.warehouseName}</p>
                <p className="text-xs text-muted-foreground">
                  {item.reserved > 0 ? `${formatNumber(item.reserved)} reserved · ` : ''}
                  {formatNumber(item.available)} {material.unit} available
                </p>
              </div>
              <p className="text-sm font-semibold shrink-0">{formatNumber(item.quantity)} {material.unit}</p>
              {canAdjust && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label={`Adjust stock at ${item.warehouseName}`}
                  onClick={() => setAdjustTarget({ warehouseId: item.warehouseId, currentQuantity: item.quantity })}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {adjustTarget && (
        <AdjustmentDialog
          open
          onOpenChange={(open) => { if (!open) setAdjustTarget(null); }}
          materialId={material.id}
          warehouseId={adjustTarget.warehouseId}
          materialName={material.name}
          currentQuantity={adjustTarget.currentQuantity}
          unit={material.unit}
        />
      )}
    </div>
  );
}
