'use client';

import React, { useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import {
  Button, Input,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Skeleton,
} from '@sitepilot/ui';
import {
  Search, Filter, Download, Plus,
  FileClock, ClipboardCheck, ClipboardList, IndianRupee, Building2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  procurementProjects,
  procurementAiInsights,
  monthlySpendData,
  type PurchaseOrder,
  type Vendor,
} from '@/data/procurement-demo';
import {
  usePurchaseOrders, useVendors, useRfqs, useDeliveries,
} from '@/hooks/api/use-procurement';
import { ProcurementKpiCard } from './components/ProcurementKpiCard';
import { AiInsightPanel } from './components/AiInsightCard';
import { PurchaseOrderTable } from './components/PurchaseOrderTable';
import { PurchaseOrderDrawer } from './components/PurchaseOrderDrawer';
import { RfqTab } from './components/RfqTab';
import { VendorsTab } from './components/VendorsTab';
import { VendorDrawer } from './components/VendorDrawer';
import { DeliveriesTab } from './components/DeliveriesTab';
import { formatCompactINR } from './components/procurement-format';

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

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } },
};

const DATE_RANGES: Record<string, number | null> = {
  all: null,
  '30': 30,
  '90': 90,
  '180': 180,
};

export default function ProcurementPage(): React.ReactElement {
  const [isClient, setIsClient] = useState(false);
  const [search, setSearch] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorDrawerOpen, setVendorDrawerOpen] = useState(false);

  const { data: orders } = usePurchaseOrders();
  const { data: vendors } = useVendors();
  const { data: rfqs } = useRfqs();
  const { data: deliveries } = useDeliveries();

  useEffect(() => { setIsClient(true); }, []);

  const kpis = useMemo(() => {
    const openRfqs = rfqs.filter((r) => r.status === 'open' || r.status === 'closing_soon' || r.status === 'evaluating').length;
    const pendingPos = orders.filter((o) => o.approvalStatus === 'pending').length;
    const approvedPos = orders.filter((o) => o.approvalStatus === 'approved').length;
    const monthlyValue = monthlySpendData[monthlySpendData.length - 1]?.spend ?? 0;
    const activeVendors = vendors.filter((v) => v.status === 'active').length;
    const delayedDeliveries = deliveries.filter((d) => d.status === 'delayed').length;
    return { openRfqs, pendingPos, approvedPos, monthlyValue, activeVendors, delayedDeliveries };
  }, [orders, rfqs, vendors, deliveries]);

  // Anchor date-range filtering to the newest order so the demo is deterministic.
  const anchorTime = useMemo(() => {
    return orders.reduce((max, o) => Math.max(max, new Date(o.requestedDate).getTime()), 0);
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    const days = DATE_RANGES[dateRange];
    const cutoff = days ? anchorTime - days * 86400000 : null;

    return orders.filter((o) => {
      const matchesSearch =
        !term ||
        o.poNumber.toLowerCase().includes(term) ||
        o.vendorName.toLowerCase().includes(term) ||
        o.projectName.toLowerCase().includes(term) ||
        o.category.toLowerCase().includes(term) ||
        o.createdBy.toLowerCase().includes(term);
      const matchesProject = projectFilter === 'all' || o.projectId === projectFilter;
      const matchesVendor = vendorFilter === 'all' || o.vendorId === vendorFilter;
      const matchesStatus = statusFilter === 'all' || o.approvalStatus === statusFilter;
      const matchesDate = cutoff === null || new Date(o.requestedDate).getTime() >= cutoff;
      return matchesSearch && matchesProject && matchesVendor && matchesStatus && matchesDate;
    });
  }, [orders, search, projectFilter, vendorFilter, statusFilter, dateRange, anchorTime]);

  if (!isClient) return <></>;

  function handleSelectOrder(order: PurchaseOrder): void {
    setSelectedOrder(order);
    setOrderDrawerOpen(true);
  }

  function handleSelectVendor(vendor: Vendor): void {
    setSelectedVendor(vendor);
    setVendorDrawerOpen(true);
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
          <h2 className="text-3xl font-bold tracking-tight">Procurement</h2>
          <p className="text-muted-foreground mt-1">
            {kpis.pendingPos} orders awaiting approval · {kpis.openRfqs} RFQs in progress
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => toast('RFQ builder opening (demo)')}>
            <Plus className="mr-1.5 h-4 w-4" /> New RFQ
          </Button>
          <Button onClick={() => toast('Purchase order builder opening (demo)')}>
            <Plus className="mr-1.5 h-4 w-4" /> New Purchase Order
          </Button>
          <Button variant="outline" onClick={() => toast.success('Export started (demo)')}>
            <Download className="mr-1.5 h-4 w-4" /> Export
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard
            title="Open RFQs"
            value={kpis.openRfqs}
            description="awaiting quotes"
            icon={<FileClock className="h-4 w-4" />}
            trendLabel="3 closing soon"
            trendDirection="up"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard
            title="Pending POs"
            value={kpis.pendingPos}
            description="need approval"
            icon={<ClipboardList className="h-4 w-4" />}
            trendLabel="review queue"
            trendDirection="up"
            accentClass="border-amber-200 dark:border-amber-800/30"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard
            title="Approved POs"
            value={kpis.approvedPos}
            description="this quarter"
            icon={<ClipboardCheck className="h-4 w-4" />}
            trendLabel="12%"
            trendDirection="up"
            accentClass="border-emerald-200 dark:border-emerald-800/30"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard
            title="Monthly Value"
            value={formatCompactINR(kpis.monthlyValue)}
            description="July procurement"
            icon={<IndianRupee className="h-4 w-4" />}
            trendLabel="7%"
            trendDirection="up"
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard
            title="Active Vendors"
            value={kpis.activeVendors}
            description="on the panel"
            icon={<Building2 className="h-4 w-4" />}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ProcurementKpiCard
            title="Delayed Deliveries"
            value={kpis.delayedDeliveries}
            description="behind schedule"
            icon={<AlertTriangle className="h-4 w-4" />}
            trendLabel="2 fewer"
            trendDirection="down"
            invertTrendColor
            accentClass="border-red-200 dark:border-red-800/30"
          />
        </motion.div>
      </motion.div>

      {/* Main content + AI panel */}
      <div className="grid gap-6 xl:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-3"
        >
          <Tabs defaultValue="orders">
            <TabsList className="mb-4 flex-wrap h-auto">
              <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
              <TabsTrigger value="rfqs">RFQs</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              {/* Filter bar */}
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search PO, vendor, project, category..."
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-full lg:w-48">
                    <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {procurementProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                  <SelectTrigger className="w-full lg:w-48">
                    <SelectValue placeholder="Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="changes_requested">Changes Requested</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="180">Last 180 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <PurchaseOrderTable orders={filteredOrders} onSelect={handleSelectOrder} />
            </TabsContent>

            <TabsContent value="rfqs">
              <RfqTab rfqs={rfqs} />
            </TabsContent>

            <TabsContent value="vendors">
              <VendorsTab vendors={vendors} onSelect={handleSelectVendor} />
            </TabsContent>

            <TabsContent value="deliveries">
              <DeliveriesTab deliveries={deliveries} />
            </TabsContent>

            <TabsContent value="analytics">
              <AnalyticsTab />
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* AI Insight panel */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="xl:col-span-1"
        >
          <AiInsightPanel insights={procurementAiInsights} className="sticky top-6" />
        </motion.div>
      </div>

      <PurchaseOrderDrawer
        order={selectedOrder}
        open={orderDrawerOpen}
        onClose={() => setOrderDrawerOpen(false)}
      />
      <VendorDrawer
        vendor={selectedVendor}
        open={vendorDrawerOpen}
        onClose={() => setVendorDrawerOpen(false)}
      />
    </div>
  );
}
