'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Skeleton, Badge, Button } from '@sitepilot/ui';
import {
  Star, Clock, Truck, ShoppingCart, Building2, AlertTriangle,
} from 'lucide-react';
import {
  useMaterialSuppliers, type MaterialSupplier,
} from '@/hooks/api/use-materials';
import { EmptyState } from '@/components/shared/EmptyState';
import { getInitials } from '@/lib/utils';
import { formatCompactINR } from './materials-format';
import { SupplierDrawer } from './SupplierDrawer';

function SupplierCard({ supplier, onSelect }: { supplier: MaterialSupplier; onSelect: (s: MaterialSupplier) => void }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onSelect(supplier)}
      className="flex h-full w-full flex-col text-left rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/40 transition-all group"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold shrink-0">
          {getInitials(supplier.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate group-hover:text-primary transition-colors">{supplier.name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-semibold">{supplier.rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">· {supplier.materialCount} materials</span>
          </div>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {supplier.leadTimeDays}d lead time
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Truck className="h-3.5 w-3.5" /> {supplier.onTimeRate}% on-time
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ShoppingCart className="h-3.5 w-3.5" /> {supplier.openPurchaseOrders} open POs
        </div>
        <div className="flex items-center justify-end">
          <Badge variant="secondary" className="text-xs">{formatCompactINR(supplier.totalSpend)}</Badge>
        </div>
      </div>
    </button>
  );
}

export function SuppliersTab(): React.ReactElement {
  const { data, isLoading, isError, refetch } = useMaterialSuppliers();
  const [selected, setSelected] = useState<MaterialSupplier | null>(null);
  const [open, setOpen] = useState(false);

  function handleSelect(supplier: MaterialSupplier): void {
    setSelected(supplier);
    setOpen(true);
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load suppliers"
        description="Something went wrong while fetching suppliers. Please try again."
        action={<Button onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="No suppliers yet"
        description="Suppliers linked to your materials will appear here with their performance, spend, and lead times."
      />
    );
  }

  return (
    <>
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {data.map((supplier) => (
          <motion.div
            key={supplier.id}
            variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
          >
            <SupplierCard supplier={supplier} onSelect={handleSelect} />
          </motion.div>
        ))}
      </motion.div>

      <SupplierDrawer supplier={selected} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
