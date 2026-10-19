'use client';

import React from 'react';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sitepilot/ui';
import { Filter, Search } from 'lucide-react';
import { PO_STATUS_OPTIONS } from '@/features/procurement/constants';
import type { NamedRef, PurchaseOrder } from '@/features/procurement/types';

export interface PurchaseOrderFilterState {
  search: string;
  projectId: string;
  vendorId: string;
  status: string;
  /** Days back from today, or 'all'. */
  dateRange: string;
}

export const DEFAULT_PO_FILTERS: PurchaseOrderFilterState = {
  search: '', projectId: 'all', vendorId: 'all', status: 'all', dateRange: 'all',
};

const DAY_MS = 86_400_000;

export function filterPurchaseOrders(orders: PurchaseOrder[], filters: PurchaseOrderFilterState): PurchaseOrder[] {
  const term = filters.search.trim().toLowerCase();
  const cutoff = filters.dateRange === 'all' ? null : Date.now() - Number(filters.dateRange) * DAY_MS;

  return orders.filter((order) => {
    const haystack = [order.poNumber, order.vendor?.name, order.project?.name, order.category, order.requestedBy?.name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return (!term || haystack.includes(term))
      && (filters.projectId === 'all' || order.project?.id === filters.projectId)
      && (filters.vendorId === 'all' || order.vendor?.id === filters.vendorId)
      && (filters.status === 'all' || order.status === filters.status)
      && (cutoff === null || new Date(order.requestedDate).getTime() >= cutoff);
  });
}

interface PurchaseOrderFiltersProps {
  filters: PurchaseOrderFilterState;
  onChange: (filters: PurchaseOrderFilterState) => void;
  projects: NamedRef[];
  vendors: NamedRef[];
}

export function PurchaseOrderFilters({ filters, onChange, projects, vendors }: PurchaseOrderFiltersProps): React.ReactElement {
  function update(patch: Partial<PurchaseOrderFilterState>): void {
    onChange({ ...filters, ...patch });
  }

  return (
    <div className="flex flex-col lg:flex-row gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search PO, vendor, project, category..."
          aria-label="Search purchase orders"
          className="pl-9"
          value={filters.search}
          onChange={(event) => update({ search: event.target.value })}
        />
      </div>
      <Select value={filters.projectId} onValueChange={(projectId) => update({ projectId })}>
        <SelectTrigger className="w-full lg:w-48" aria-label="Project">
          <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.vendorId} onValueChange={(vendorId) => update({ vendorId })}>
        <SelectTrigger className="w-full lg:w-48" aria-label="Vendor">
          <SelectValue placeholder="Vendor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Vendors</SelectItem>
          {vendors.map((vendor) => <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.status} onValueChange={(status) => update({ status })}>
        <SelectTrigger className="w-full lg:w-44" aria-label="Status">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          {PO_STATUS_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.dateRange} onValueChange={(dateRange) => update({ dateRange })}>
        <SelectTrigger className="w-full lg:w-40" aria-label="Date range">
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
  );
}
