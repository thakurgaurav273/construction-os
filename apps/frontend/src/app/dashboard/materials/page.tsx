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
import { Download, Plus } from 'lucide-react';
import { MaterialsKpis } from './components/MaterialsKpis';
import { MaterialsTable } from './components/MaterialsTable';
import { MaterialDrawer } from './components/MaterialDrawer';
import { MaterialFormDialog } from './components/MaterialFormDialog';
import { InventoryTab } from './components/InventoryTab';
import { MovementsTab } from './components/MovementsTab';
import { SuppliersTab } from './components/SuppliersTab';
import { useMaterials } from '@/hooks/api/use-materials';
import { Can } from '@/components/shared/Can';
import { downloadCsv } from '@/lib/download-csv';
import { format } from 'date-fns';

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
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start justify-between gap-4"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Materials</h2>
          <p className="text-muted-foreground mt-1">
            Track stock, deliveries, and consumption across every project in real time.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
          <Can permission="material.manage">
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" /> Add Material
            </Button>
          </Can>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <MaterialsKpis />

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Tabs defaultValue="materials">
          <TabsList className="mb-4 flex-wrap h-auto">
            <TabsTrigger value="materials">Materials</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
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
