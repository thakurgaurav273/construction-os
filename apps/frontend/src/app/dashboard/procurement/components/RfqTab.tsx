'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Input, Badge, Progress,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Search, Filter, ChevronRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatCompactINR } from './procurement-format';
import { PROCUREMENT_CATEGORIES, RFQ_STATUS_OPTIONS } from '@/features/procurement/constants';
import type { Rfq } from '@/features/procurement/types';

const COLUMN_COUNT = 10;

interface RfqTabProps {
  rfqs: Rfq[];
  onSelect: (rfq: Rfq) => void;
}

export function RfqTab({ rfqs, onSelect }: RfqTabProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const categories = useMemo(
    () => [...new Set([...PROCUREMENT_CATEGORIES, ...rfqs.map((rfq) => rfq.category)])],
    [rfqs],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rfqs.filter((rfq) => {
      const matchesSearch =
        !term ||
        rfq.rfqNumber.toLowerCase().includes(term) ||
        rfq.title.toLowerCase().includes(term) ||
        (rfq.project?.name.toLowerCase().includes(term) ?? false);

      const matchesStatus = statusFilter === 'all' || rfq.status === statusFilter;
      const matchesCategory = categoryFilter === 'all' || rfq.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [rfqs, search, statusFilter, categoryFilter]);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by RFQ number, title, project..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {RFQ_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {rfqs.length} RFQs
      </p>

      {/* Table */}
      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">RFQ</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">Project</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Category</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Invited</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Responses</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Closing</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden xl:table-cell">Est. Value</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">Priority</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={COLUMN_COUNT} className="py-16 text-center text-muted-foreground">
                    {rfqs.length === 0 ? 'No RFQs yet. Issue one to start collecting vendor quotes.' : 'No RFQs match your filters.'}
                  </td>
                </tr>
              ) : (
                filtered.map((rfq, idx) => {
                  const responseRate = rfq.vendorsInvited
                    ? Math.round((rfq.quotesReceived / rfq.vendorsInvited) * 100)
                    : 0;
                  return (
                    <motion.tr
                      key={rfq.id}
                      initial={false}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => onSelect(rfq)}
                      onKeyDown={(event) => { if (event.key === 'Enter') onSelect(rfq); }}
                      tabIndex={0}
                      aria-label={`Open ${rfq.rfqNumber}`}
                      className="border-b last:border-0 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none transition-colors group cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium whitespace-nowrap">{rfq.rfqNumber}</p>
                        <p className="text-xs text-muted-foreground max-w-[220px] truncate">{rfq.title}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-xs text-muted-foreground max-w-[160px] truncate">{rfq.project?.name ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">{rfq.category}</Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-center text-sm">
                        {rfq.vendorsInvited}
                      </td>
                      <td className="px-4 py-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress value={responseRate} className="h-1.5 w-16" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {rfq.quotesReceived}/{rfq.vendorsInvited}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span
                          className={`text-xs whitespace-nowrap ${
                            rfq.isClosingSoon || rfq.isPastClosing
                              ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {format(new Date(rfq.closingDate), 'dd MMM yyyy')}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-xs font-medium whitespace-nowrap">
                        {rfq.estimatedValue ? formatCompactINR(rfq.estimatedValue) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge kind="rfq" value={rfq.status} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <StatusBadge kind="priority" value={rfq.priority} showIcon={false} />
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
