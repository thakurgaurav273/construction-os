'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Button, Input, Badge, Progress,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { Search, Filter, Eye, Users, FileText } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatCompactINR } from './procurement-format';
import {
  PROCUREMENT_CATEGORIES,
  type ProcurementCategory,
  type Rfq,
  type RfqStatus,
} from '@/data/procurement-demo';

const COLUMN_COUNT = 10;

const RFQ_STATUSES: { value: RfqStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'open', label: 'Open' },
  { value: 'closing_soon', label: 'Closing Soon' },
  { value: 'evaluating', label: 'Evaluating' },
  { value: 'awarded', label: 'Awarded' },
];

interface RfqTabProps {
  rfqs: Rfq[];
}

export function RfqTab({ rfqs }: RfqTabProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return rfqs.filter((rfq) => {
      const matchesSearch =
        !search ||
        rfq.rfqNumber.toLowerCase().includes(search.toLowerCase()) ||
        rfq.title.toLowerCase().includes(search.toLowerCase()) ||
        rfq.projectName.toLowerCase().includes(search.toLowerCase());

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
            {RFQ_STATUSES.map((s) => (
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
            {PROCUREMENT_CATEGORIES.map((c: ProcurementCategory) => (
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
                    No RFQs match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((rfq, idx) => {
                  const responseRate = rfq.vendorsInvited
                    ? Math.round((rfq.responsesReceived / rfq.vendorsInvited) * 100)
                    : 0;
                  return (
                    <motion.tr
                      key={rfq.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b last:border-0 hover:bg-muted/40 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium whitespace-nowrap">{rfq.rfqNumber}</p>
                        <p className="text-xs text-muted-foreground max-w-[220px] truncate">{rfq.title}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-xs text-muted-foreground max-w-[160px] truncate">{rfq.projectName}</p>
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
                            {rfq.responsesReceived}/{rfq.vendorsInvited}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span
                          className={`text-xs whitespace-nowrap ${
                            rfq.status === 'closing_soon'
                              ? 'text-amber-600 dark:text-amber-400 font-semibold'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {format(new Date(rfq.closingDate), 'dd MMM yyyy')}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-xs font-medium whitespace-nowrap">
                        {formatCompactINR(rfq.estimatedValue)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge kind="rfq" value={rfq.status} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <StatusBadge kind="priority" value={rfq.priority} showIcon={false} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="View RFQ"
                            onClick={(e) => { e.stopPropagation(); toast('Opening RFQ (demo)'); }}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Invite vendors"
                            onClick={(e) => { e.stopPropagation(); toast('Invite vendors (demo)'); }}
                          >
                            <Users className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Compare quotes"
                            onClick={(e) => { e.stopPropagation(); toast('Compare quotes (demo)'); }}
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
