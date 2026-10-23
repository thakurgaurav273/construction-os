'use client';

import React, { useMemo, useState } from 'react';
import { Search, Plus, ClipboardList, AlertTriangle } from 'lucide-react';
import { Button, Input, Skeleton } from '@sitepilot/ui';
import { usePurchaseOrders } from '@/hooks/api/use-procurement';
import { useCan } from '@/hooks/api/use-access';
import { useProjectOpenForWork } from '@/hooks/api/use-projects';
import { EmptyState } from '@/components/shared/EmptyState';
import { PurchaseOrderFormDialog } from '@/features/procurement/components/PurchaseOrderFormDialog';
import { PurchaseOrderTable } from '@/app/dashboard/procurement/components/PurchaseOrderTable';
import { PurchaseOrderDrawer } from '@/app/dashboard/procurement/components/PurchaseOrderDrawer';
import { formatCompactINR } from '@/features/procurement/utils/format';

export default function ProjectPurchaseOrdersPage({ params }: { params: { id: string } }): React.ReactElement {
  const { data: orders = [], isLoading, isError, refetch } = usePurchaseOrders({ projectId: params.id });
  const [search, setSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const isOpen = useProjectOpenForWork(params.id);
  const canCreate = useCan()('po.create') && isOpen;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orders.filter((order) =>
      !term
      || order.poNumber.toLowerCase().includes(term)
      || (order.vendor?.name.toLowerCase().includes(term) ?? false)
      || order.category.toLowerCase().includes(term));
  }, [orders, search]);

  const committed = orders.filter((order) => order.status === 'APPROVED').reduce((sum, order) => sum + order.amount, 0);
  const pending = orders.filter((order) => order.status === 'PENDING').length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-[360px] w-full rounded-xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load this project's purchase orders"
        description="Check your connection and try again."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Purchase Orders</h2>
          <p className="text-muted-foreground">
            {orders.length
              ? `${formatCompactINR(committed)} committed · ${pending} awaiting approval`
              : 'Materials, equipment and services ordered for this project.'}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" /> New Purchase Order
          </Button>
        )}
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No purchase orders for this project"
          description="Raise a purchase order to procure materials or equipment for this site."
          action={canCreate ? <Button onClick={() => setCreateOpen(true)}>New Purchase Order</Button> : undefined}
        />
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by PO number, vendor or category..."
              aria-label="Search purchase orders"
              className="pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <PurchaseOrderTable orders={filtered} onSelect={(order) => setSelectedOrderId(order.id)} />
        </>
      )}

      <PurchaseOrderDrawer
        orderId={selectedOrderId}
        open={!!selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onOpenOrder={setSelectedOrderId}
      />
      <PurchaseOrderFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={params.id}
        onSaved={setSelectedOrderId}
      />
    </div>
  );
}
