'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
  Skeleton,
} from '@sitepilot/ui';
import { Download, Plus } from 'lucide-react';
import { MaterialsKpis } from './components/MaterialsKpis';
import { MaterialsTable } from './components/MaterialsTable';
import { MaterialDrawer } from './components/MaterialDrawer';
import { MaterialFormDialog } from './components/MaterialFormDialog';
import { InventoryTab } from './components/InventoryTab';
import { MovementsTab } from './components/MovementsTab';
import { SuppliersTab } from './components/SuppliersTab';
import { RequestsTab } from './components/RequestsTab';
import { useMaterials } from '@/hooks/api/use-materials';
import { Can } from '@/components/shared/Can';
import { downloadCsv } from '@/lib/download-csv';
import { ImportButton } from '@/features/data-import/components/ImportButton';
import { format } from 'date-fns';
import { PageAction, PageHeader } from '@/components/shared/PageHeader';

// Analytics is chart-heavy and sits behind a tab, so load it on demand.
const AnalyticsTab = dynamic(
  () => import('./components/AnalyticsTab').then((mod) => mod.AnalyticsTab),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-72 w-full rounded-xl" />
        ))}
      </div>
    ),
  },
);

export default function MaterialsPage(): React.ReactElement {
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const { data: materialsData } = useMaterials();
  
  const materialsList = materialsData?.items || [];

  function handleSelectMaterial(materialId: string): void {
    setSelectedMaterialId(materialId);
    setDrawerOpen(true);
  }

  function handleExport(): void {
    if (materialsList.length === 0) {
      toast.error('No materials to export');
      return;
    }
    downloadCsv(
      `materials_${format(new Date(), 'yyyy-MM-dd')}.csv`,
      ['Name', 'SKU', 'Category', 'Supplier', 'Quantity', 'Unit', 'Unit Cost', 'Status'],
      materialsList.map((material) => [
        material.name, material.sku, material.categoryName, material.supplierName,
        material.quantity, material.unit, material.unitCost, material.status,
      ]),
    );
    toast.success(`Exported ${materialsList.length} materials`);
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
      >
        <PageHeader
          title="Materials"
          description="Track stock, deliveries, and consumption across every project in real time."
          actions={(
            <>
              <PageAction icon={Download} label="Export" onClick={handleExport} />
              <ImportButton entity="MATERIAL" />
              <Can permission="material.manage">
                <PageAction primary icon={Plus} label="Add Material" onClick={() => setFormOpen(true)} data-tour="materials-new" />
              </Can>
            </>
          )}
        />
      </motion.div>

      {/* KPI Cards */}
      <MaterialsKpis />

      {/* Tabs */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
      >
        <Tabs defaultValue="materials">
          <TabsList className="mb-4 flex-wrap h-auto" data-tour="materials-tabs">
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            <MaterialsTable onSelect={handleSelectMaterial} />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryTab onSelect={handleSelectMaterial} />
          </TabsContent>

          <TabsContent value="requests">
            <RequestsTab />
          </TabsContent>

          <TabsContent value="movements">
            <MovementsTab />
          </TabsContent>

          <TabsContent value="suppliers">
            <SuppliersTab />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </motion.div>

      <MaterialDrawer
        materialId={selectedMaterialId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
      <MaterialFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}
