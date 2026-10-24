'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Button,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Skeleton,
} from '@sitepilot/ui';
import { Download } from 'lucide-react';
import { InventoryKpis } from './components/InventoryKpis';
import { InventoryItemsTab } from './components/InventoryItemsTab';
import { InventoryItemDrawer } from './components/InventoryItemDrawer';
import { WarehousesTab } from './components/WarehousesTab';
import { WarehouseDrawer } from './components/WarehouseDrawer';
import { TransfersTab } from './components/TransfersTab';
import { TransferDrawer } from './components/TransferDrawer';
import { TransactionsTab } from './components/TransactionsTab';
import { format } from 'date-fns';
import { fetchAllInventoryItems } from '@/hooks/api/use-inventory';
import { downloadCsv } from '@/lib/download-csv';
import { getApiErrorMessage } from '@/lib/api/errors';
import { ImportButton } from '@/features/data-import/components/ImportButton';

// Analytics is chart-heavy and sits behind a tab, so load it on demand.
const AnalyticsTab = dynamic(
  () => import('./components/AnalyticsTab').then((mod) => mod.AnalyticsTab),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-72 w-full rounded-xl" />
        ))}
      </div>
    ),
  },
);

export default function InventoryPage(): React.ReactElement {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemDrawerOpen, setItemDrawerOpen] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [warehouseDrawerOpen, setWarehouseDrawerOpen] = useState(false);
  const [selectedTransferId, setSelectedTransferId] = useState<string | null>(null);
  const [transferDrawerOpen, setTransferDrawerOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport(): Promise<void> {
    setExporting(true);
    try {
      const items = await fetchAllInventoryItems();
      if (items.length === 0) {
        toast.error('No stock to export yet');
        return;
      }
      downloadCsv(
        `inventory_${format(new Date(), 'yyyy-MM-dd')}.csv`,
        ['Material', 'SKU', 'Store', 'Category', 'Unit', 'On hand', 'Reserved', 'Available', 'Incoming', 'Reorder level', 'Unit cost (INR)', 'Value (INR)', 'Status'],
        items.map((item) => [
          item.materialName, item.sku, item.warehouseName, item.categoryName, item.unit, item.quantity, item.reserved,
          item.available, item.incoming, item.reorderLevel, item.unitCost, item.value, item.status,
        ]),
      );
      toast.success(`Exported ${items.length} stock lines`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Couldn't export inventory. Try again."));
    } finally {
      setExporting(false);
    }
  }

  function handleSelectItem(itemId: string): void {
    setSelectedItemId(itemId);
    setItemDrawerOpen(true);
  }

  function handleSelectWarehouse(warehouseId: string): void {
    setSelectedWarehouseId(warehouseId);
    setWarehouseDrawerOpen(true);
  }

  function handleSelectTransfer(transferId: string): void {
    setSelectedTransferId(transferId);
    setTransferDrawerOpen(true);
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Inventory</h2>
          <p className="text-muted-foreground mt-1">
            Know exactly what you have, where it is, and when to reorder - across every warehouse and site store.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="mr-1.5 h-4 w-4" /> {exporting ? 'Exporting…' : 'Export'}
          </Button>
          <ImportButton entity="OPENING_STOCK" />
        </div>
      </motion.div>

      {/* KPI Cards */}
      <InventoryKpis />

      {/* Tabs */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
      >
        <Tabs defaultValue="items">
          <TabsList className="mb-4 flex-wrap h-auto" data-tour="inventory-tabs">
            <TabsTrigger value="items">Items</TabsTrigger>
            <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="items">
            <InventoryItemsTab onSelect={handleSelectItem} />
          </TabsContent>

          <TabsContent value="warehouses">
            <WarehousesTab onSelect={handleSelectWarehouse} />
          </TabsContent>

          <TabsContent value="transfers">
            <TransfersTab onSelect={handleSelectTransfer} />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionsTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </motion.div>

      <InventoryItemDrawer
        itemId={selectedItemId}
        open={itemDrawerOpen}
        onClose={() => setItemDrawerOpen(false)}
      />
      <WarehouseDrawer
        warehouseId={selectedWarehouseId}
        open={warehouseDrawerOpen}
        onClose={() => setWarehouseDrawerOpen(false)}
      />
      <TransferDrawer
        transferId={selectedTransferId}
        open={transferDrawerOpen}
        onClose={() => setTransferDrawerOpen(false)}
      />
    </div>
  );
}
