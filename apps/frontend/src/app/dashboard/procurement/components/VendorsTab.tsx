'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Input,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Search, Filter, Building2 } from 'lucide-react';
import { VendorCard } from './VendorCard';
import { PROCUREMENT_CATEGORIES, type Vendor } from '@/data/procurement-demo';

type SortKey = 'performance' | 'rating' | 'onTime' | 'outstanding';

const SORTERS: Record<SortKey, (a: Vendor, b: Vendor) => number> = {
  performance: (a, b) => b.performanceScore - a.performanceScore,
  rating: (a, b) => b.rating - a.rating,
  onTime: (a, b) => b.onTimeDeliveryPercent - a.onTimeDeliveryPercent,
  outstanding: (a, b) => b.outstandingBalance - a.outstandingBalance,
};

interface VendorsTabProps {
  vendors: Vendor[];
  onSelect: (vendor: Vendor) => void;
}

export function VendorsTab({ vendors, onSelect }: VendorsTabProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('performance');

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return vendors
      .filter((vendor) => {
        const matchesSearch =
          !query ||
          vendor.name.toLowerCase().includes(query) ||
          vendor.code.toLowerCase().includes(query) ||
          vendor.city.toLowerCase().includes(query);
        const matchesCategory =
          categoryFilter === 'all' ||
          vendor.categories.includes(categoryFilter as Vendor['categories'][number]);
        return matchesSearch && matchesCategory;
      })
      .sort(SORTERS[sortKey]);
  }, [vendors, search, categoryFilter, sortKey]);

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
            {PROCUREMENT_CATEGORIES.map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
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
          <p className="mt-3 text-sm">No vendors match your filters.</p>
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
