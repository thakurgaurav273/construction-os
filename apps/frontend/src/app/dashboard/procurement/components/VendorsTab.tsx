'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Search, Filter, Building2 } from 'lucide-react';
import { VendorCard } from './VendorCard';
import { PROCUREMENT_CATEGORIES } from '@/features/procurement/constants';
import type { Vendor } from '@/features/procurement/types';

type SortKey = 'performance' | 'rating' | 'onTime' | 'outstanding';

const SORTERS: Record<SortKey, (a: Vendor, b: Vendor) => number> = {
  performance: (a, b) => b.performanceScore - a.performanceScore,
  rating: (a, b) => b.rating - a.rating,
  // Vendors without a received delivery yet sort last.
  onTime: (a, b) => (b.stats.onTimeDeliveryPercent ?? -1) - (a.stats.onTimeDeliveryPercent ?? -1),
  outstanding: (a, b) => b.outstandingBalance - a.outstandingBalance,
};

interface VendorsTabProps {
  vendors: Vendor[];
  onSelect: (vendor: Vendor) => void;
}

export function VendorsTab({ vendors, onSelect }: VendorsTabProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [sortKey, setSortKey] = useState<SortKey>('performance');

  const categories = useMemo(
    () => [...new Set([...PROCUREMENT_CATEGORIES, ...vendors.flatMap((vendor) => vendor.categories)])],
    [vendors],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vendors
      .filter((vendor) => {
        const matchesSearch =
          !query ||
          vendor.name.toLowerCase().includes(query) ||
          vendor.code.toLowerCase().includes(query) ||
          (vendor.city?.toLowerCase().includes(query) ?? false);
        const matchesCategory = categoryFilter === 'all' || vendor.categories.includes(categoryFilter);
        const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
        return matchesSearch && matchesCategory && matchesStatus;
      })
      .sort(SORTERS[sortKey]);
  }, [vendors, search, categoryFilter, statusFilter, sortKey]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, code, city..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36" aria-label="Vendor status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="all">All vendors</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortKey} onValueChange={(value) => setSortKey(value as SortKey)}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="performance">Performance Score</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="onTime">On-Time Delivery</SelectItem>
            <SelectItem value="outstanding">Outstanding Balance</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {vendors.length} vendors
      </p>

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Building2 className="mx-auto h-10 w-10 opacity-40" />
          <p className="mt-3 text-sm">
            {vendors.length === 0 ? 'No vendors yet. Add your first supplier to start raising orders.' : 'No vendors match your filters.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((vendor, idx) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
            >
              <VendorCard vendor={vendor} onClick={() => onSelect(vendor)} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
