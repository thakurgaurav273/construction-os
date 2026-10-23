'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Badge, Button, Progress, Skeleton } from '@sitepilot/ui';
import {
  Warehouse, Package, MapPin, AlertTriangle, Layers, Activity, Plus,
} from 'lucide-react';
import { useWarehouses, type WarehouseCard as WarehouseCardData } from '@/hooks/api/use-inventory';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNumber } from '@/lib/utils';
import { useCan } from '@/hooks/api/use-access';
import { WarehouseFormDialog } from '@/features/inventory/components/WarehouseFormDialog';
import { formatCompactINR, formatWarehouseType } from './inventory-format';

interface WarehousesTabProps {
  onSelect: (warehouseId: string) => void;
}

function WarehouseCard({
  warehouse,
  onSelect,
}: {
  warehouse: WarehouseCardData;
  onSelect: (id: string) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onSelect(warehouse.id)}
      className="text-left rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/40 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
            <Warehouse className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate group-hover:text-primary transition-colors">{warehouse.name}</p>
            <p className="text-xs text-muted-foreground">{warehouse.code}</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs shrink-0">{formatWarehouseType(warehouse.type)}</Badge>
      </div>

      {warehouse.city && (
        <p className="text-xs text-muted-foreground flex items-center gap-1 mb-3">
          <MapPin className="h-3 w-3" /> {warehouse.city}
        </p>
      )}

      <div className="grid grid-cols-3 gap-2 text-center mb-3">
        <div>
          <p className="text-base font-bold">{formatNumber(warehouse.itemCount)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-0.5">
            <Package className="h-3 w-3" /> Items
          </p>
        </div>
        <div>
          <p className="text-base font-bold">{formatNumber(warehouse.locationCount)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center justify-center gap-0.5">
            <Layers className="h-3 w-3" /> Bins
          </p>
        </div>
        <div>
          <p className={`text-base font-bold ${warehouse.lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
            {formatNumber(warehouse.lowStockCount)}
          </p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Low</p>
        </div>
      </div>

      {warehouse.utilization !== null && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Utilization</span>
            <span className="font-medium text-foreground">{warehouse.utilization}%</span>
          </div>
          <Progress value={warehouse.utilization} className="h-1.5" />
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground flex items-center gap-1">
          <Activity className="h-3 w-3" /> {formatNumber(warehouse.recentActivity)} moves / 7d
        </span>
        <span className="font-semibold text-foreground">{formatCompactINR(warehouse.inventoryValue)}</span>
      </div>
    </button>
  );
}

export function WarehousesTab({ onSelect }: WarehousesTabProps): React.ReactElement {
  const { data, isLoading, isError, refetch } = useWarehouses();
  const canManage = useCan()('warehouse.manage');
  const [formOpen, setFormOpen] = useState(false);
  const formDialog = <WarehouseFormDialog open={formOpen} onOpenChange={setFormOpen} onSaved={onSelect} />;

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load warehouses"
        description="Something went wrong while fetching warehouses. Please try again."
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const warehouses = data ?? [];

  if (warehouses.length === 0) {
    return (
      <>
        <EmptyState
          icon={Warehouse}
          title="No stores yet"
          description="Add your central warehouse and site stores to start receiving and tracking stock."
          action={canManage ? <Button onClick={() => setFormOpen(true)}>Add Store</Button> : undefined}
        />
        {formDialog}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> Add Store
          </Button>
        </div>
      )}
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {warehouses.map((warehouse) => (
          <WarehouseCard key={warehouse.id} warehouse={warehouse} onSelect={onSelect} />
        ))}
      </motion.div>
      {formDialog}
    </div>
  );
}
