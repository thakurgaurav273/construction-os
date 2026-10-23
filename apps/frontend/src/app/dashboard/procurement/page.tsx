'use client';

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, Download, Plus, Building2, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import {
  usePurchaseOrders, useVendors, useRfqs, useDeliveries, useProcurementSummary, useProcurementAnalytics,
} from '@/hooks/api/use-procurement';
import { useProjects } from '@/hooks/api/use-projects';
import { useCan } from '@/hooks/api/use-access';
import { downloadCsv } from '@/lib/download-csv';
import { EmptyState } from '@/components/shared/EmptyState';
import { buildProcurementInsights, type ProcurementInsight } from '@/features/procurement/utils/insights';
import { PurchaseOrderFormDialog } from '@/features/procurement/components/PurchaseOrderFormDialog';
import { RfqFormDialog } from '@/features/procurement/components/RfqFormDialog';
import { VendorFormDialog } from '@/features/procurement/components/VendorFormDialog';
import { ProcurementKpis } from './components/ProcurementKpis';
import { AiInsightPanel } from '@/components/shared/AiInsightPanel';
import { PurchaseOrderFilters, DEFAULT_PO_FILTERS, filterPurchaseOrders } from './components/PurchaseOrderFilters';
import { PurchaseOrderTable } from './components/PurchaseOrderTable';
import { PurchaseOrderDrawer } from './components/PurchaseOrderDrawer';
import { RfqTab } from './components/RfqTab';
import { RfqDrawer } from './components/RfqDrawer';
import { VendorsTab } from './components/VendorsTab';
import { VendorDrawer } from './components/VendorDrawer';
import { DeliveriesTab } from './components/DeliveriesTab';
import ProcurementLoading from './loading';

// Analytics is chart-heavy and sits behind a tab, so load it on demand.
const AnalyticsTab = dynamic(
  () => import('./components/AnalyticsTab').then((mod) => mod.AnalyticsTab),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-72 w-full rounded-xl" />)}
      </div>
    ),
  },
);

type Drawer = { kind: 'order' | 'rfq' | 'vendor'; id: string } | null;
type CreateDialog = 'order' | 'rfq' | 'vendor' | null;

export default function ProcurementPage(): React.ReactElement {
  const [tab, setTab] = useState('orders');
  const [filters, setFilters] = useState(DEFAULT_PO_FILTERS);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [createDialog, setCreateDialog] = useState<CreateDialog>(null);
  const can = useCan();

  const ordersQuery = usePurchaseOrders();
  const { data: vendors = [] } = useVendors();
  const { data: rfqs = [] } = useRfqs();
  const { data: deliveries = [] } = useDeliveries();
  const { data: summary } = useProcurementSummary();
  const { data: analytics } = useProcurementAnalytics();
  const { data: projects = [] } = useProjects();

  const orders = useMemo(() => ordersQuery.data ?? [], [ordersQuery.data]);
  const filteredOrders = useMemo(() => filterPurchaseOrders(orders, filters), [orders, filters]);
  const insights = useMemo(() => (summary ? buildProcurementInsights(summary) : undefined), [summary]);
  const selectedVendor = drawer?.kind === 'vendor' ? vendors.find((vendor) => vendor.id === drawer.id) ?? null : null;

  const openOrder = (id: string): void => setDrawer({ kind: 'order', id });
  const closeDrawer = (): void => setDrawer(null);

  function handleInsight(insight: ProcurementInsight): void {
    if (insight.target) setDrawer({ kind: insight.target.kind, id: insight.target.id });
  }

  function handleExport(): void {
    if (filteredOrders.length === 0) {
      toast.error('No purchase orders to export');
      return;
    }
    downloadCsv(
      `purchase_orders_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      ['PO Number', 'Project', 'Vendor', 'Category', 'Requested By', 'Requested', 'Expected', 'Amount (INR)', 'Status', 'Delivery', 'Received %', 'Priority'],
      filteredOrders.map((order) => [
        order.poNumber, order.project?.name, order.vendor?.name, order.category, order.requestedBy?.name,
        order.requestedDate.slice(0, 10), order.expectedDelivery.slice(0, 10), order.amount, order.status,
        order.deliveryStatus, order.receivedPercent, order.priority,
      ]),
    );
    toast.success(`Exported ${filteredOrders.length} purchase orders`);
  }

  if (ordersQuery.isLoading) return <ProcurementLoading />;

  if (ordersQuery.isError) {
    return (
      <div className="flex-1 p-4 md:p-8 pt-6">
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load procurement"
          description="Purchase orders couldn't be fetched. Check your connection and try again."
          action={<Button onClick={() => ordersQuery.refetch()}>Retry</Button>}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Procurement</h2>
          <p className="text-muted-foreground mt-1">
            {summary
              ? `${summary.pendingApprovals} orders awaiting approval · ${summary.openRfqs} RFQs in progress`
              : 'Purchase orders, RFQs, vendors and deliveries'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          {can('vendor.manage') && (
            <Button variant="outline" onClick={() => setCreateDialog('vendor')}>
              <Building2 className="mr-1.5 h-4 w-4" /> Add Vendor
            </Button>
          )}
          {can('rfq.manage') && (
            <Button variant="outline" onClick={() => setCreateDialog('rfq')}>
              <Plus className="mr-1.5 h-4 w-4" /> New RFQ
            </Button>
          )}
          {can('po.create') && (
            <Button onClick={() => setCreateDialog('order')}>
              <Plus className="mr-1.5 h-4 w-4" /> New Purchase Order
            </Button>
          )}
        </div>
      </motion.div>

      <ProcurementKpis summary={summary} />

      <div className="grid gap-6 xl:grid-cols-4">
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          className="xl:col-span-3 min-w-0"
        >
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
              <TabsTrigger value="rfqs">RFQs</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              {orders.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No purchase orders yet"
                  description={can('po.create')
                    ? 'Raise your first purchase order, or issue an RFQ to compare vendor quotes first.'
                    : 'Purchase orders raised by your team will appear here.'}
                  action={can('po.create') ? <Button onClick={() => setCreateDialog('order')}>New Purchase Order</Button> : undefined}
                />
              ) : (
                <>
                  <PurchaseOrderFilters filters={filters} onChange={setFilters} projects={projects} vendors={vendors} />
                  <PurchaseOrderTable orders={filteredOrders} onSelect={(order) => openOrder(order.id)} />
                </>
              )}
            </TabsContent>

            <TabsContent value="rfqs">
              <RfqTab rfqs={rfqs} onSelect={(rfq) => setDrawer({ kind: 'rfq', id: rfq.id })} />
            </TabsContent>

            <TabsContent value="vendors">
              <VendorsTab vendors={vendors} onSelect={(vendor) => setDrawer({ kind: 'vendor', id: vendor.id })} />
            </TabsContent>

            <TabsContent value="deliveries">
              <DeliveriesTab deliveries={deliveries} analytics={analytics} onOpenOrder={openOrder} />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsTab />
            </TabsContent>
          </Tabs>
        </motion.div>

        <motion.div
          initial={false}
          animate={{ opacity: 1, x: 0 }}
          className="xl:col-span-1"
        >
          <AiInsightPanel title="AI Procurement Insights" insights={insights} onSelect={handleInsight} className="sticky top-6" />
        </motion.div>
      </div>

      <PurchaseOrderDrawer
        orderId={drawer?.kind === 'order' ? drawer.id : null}
        open={drawer?.kind === 'order'}
        onClose={closeDrawer}
        onOpenOrder={openOrder}
      />
      <RfqDrawer
        rfqId={drawer?.kind === 'rfq' ? drawer.id : null}
        open={drawer?.kind === 'rfq'}
        onClose={closeDrawer}
        onOpenOrder={openOrder}
      />
      <VendorDrawer vendor={selectedVendor} open={!!selectedVendor} onClose={closeDrawer} onOpenOrder={openOrder} />

      <PurchaseOrderFormDialog
        open={createDialog === 'order'}
        onOpenChange={(open) => setCreateDialog(open ? 'order' : null)}
        onSaved={openOrder}
      />
      <RfqFormDialog
        open={createDialog === 'rfq'}
        onOpenChange={(open) => setCreateDialog(open ? 'rfq' : null)}
        onCreated={(id) => setDrawer({ kind: 'rfq', id })}
      />
      <VendorFormDialog open={createDialog === 'vendor'} onOpenChange={(open) => setCreateDialog(open ? 'vendor' : null)} />
    </div>
  );
}
