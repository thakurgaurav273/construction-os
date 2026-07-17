'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@sitepilot/ui';
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Eye,
} from 'lucide-react';
import { format } from 'date-fns';
import { StatusBadge } from './StatusBadge';
import { formatCurrency } from './procurement-format';
import type { ProcurementPriority, PurchaseOrder } from '@/data/procurement-demo';

const PAGE_SIZE = 12;

type SortKey = 'poNumber' | 'amount' | 'expectedDelivery' | 'priority';
type SortDir = 'asc' | 'desc';

const PRIORITY_RANK: Record<ProcurementPriority, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0,
};

interface PurchaseOrderTableProps {
  orders: PurchaseOrder[];
  onSelect: (po: PurchaseOrder) => void;
}

function compare(a: PurchaseOrder, b: PurchaseOrder, key: SortKey): number {
  switch (key) {
    case 'poNumber':
      return a.poNumber.localeCompare(b.poNumber);
    case 'amount':
      return a.amount - b.amount;
    case 'expectedDelivery':
      return new Date(a.expectedDelivery).getTime() - new Date(b.expectedDelivery).getTime();
    case 'priority':
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    default:
      return 0;
  }
}

export function PurchaseOrderTable({ orders, onSelect }: PurchaseOrderTableProps): React.ReactElement {
  const [sortKey, setSortKey] = useState<SortKey>('expectedDelivery');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [orders.length]);

  const sorted = useMemo(() => {
    const copy = [...orders];
    copy.sort((a, b) => {
      const result = compare(a, b, sortKey);
      return sortDir === 'asc' ? result : -result;
    });
    return copy;
  }, [orders, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginated = sorted.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  function handleSort(key: SortKey): void {
    if (key === sortKey) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ column }: { column: SortKey }): React.ReactElement {
    if (column !== sortKey) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  const headClass = 'text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap';

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Showing {paginated.length} of {orders.length} purchase orders
      </p>

      <div className="rounded-xl border overflow-hidden">
        <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b bg-muted/95 backdrop-blur">
                <th className={headClass}>
                  <button
                    type="button"
                    onClick={() => handleSort('poNumber')}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    PO Number <SortIcon column="poNumber" />
                  </button>
                </th>
                <th className={`${headClass} hidden lg:table-cell`}>Project</th>
                <th className={headClass}>Vendor</th>
                <th className={`${headClass} hidden xl:table-cell`}>Category</th>
                <th className={`${headClass} hidden xl:table-cell`}>Created By</th>
                <th className={`${headClass} hidden lg:table-cell`}>Requested</th>
                <th className={`${headClass} hidden md:table-cell`}>
                  <button
                    type="button"
                    onClick={() => handleSort('expectedDelivery')}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Expected <SortIcon column="expectedDelivery" />
                  </button>
                </th>
                <th className={`${headClass} text-right`}>
                  <button
                    type="button"
                    onClick={() => handleSort('amount')}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Amount <SortIcon column="amount" />
                  </button>
                </th>
                <th className={headClass}>Approval</th>
                <th className={`${headClass} hidden md:table-cell`}>Delivery</th>
                <th className={`${headClass} hidden lg:table-cell`}>
                  <button
                    type="button"
                    onClick={() => handleSort('priority')}
                    className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    Priority <SortIcon column="priority" />
                  </button>
                </th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-16 text-center text-muted-foreground">
                    No purchase orders match your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((po, idx) => (
                  <motion.tr
                    key={po.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    onClick={() => onSelect(po)}
                    className="border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold group-hover:text-primary transition-colors whitespace-nowrap">
                        {po.poNumber}
                      </p>
                      <p className="text-xs text-muted-foreground xl:hidden">{po.category}</p>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground max-w-[160px] truncate">{po.projectName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-[200px] truncate whitespace-nowrap">{po.vendorName}</p>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {po.category}
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {po.createdBy}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(po.requestedDate), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(po.expectedDelivery), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                      {formatCurrency(po.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge kind="approval" value={po.approvalStatus} />
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <StatusBadge kind="delivery" value={po.deliveryStatus} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <StatusBadge kind="priority" value={po.priority} />
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelect(po);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {safeCurrentPage} of {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={pageNum}
                  variant={safeCurrentPage === pageNum ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(pageNum)}
                  className="h-8 w-8 p-0 text-xs"
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
