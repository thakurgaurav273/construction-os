'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Badge, Button, Input, Skeleton, cn,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import {
  Search, ChevronLeft, ChevronRight, ArrowRight, Plus, ArrowLeftRight, AlertTriangle,
} from 'lucide-react';
import {
  useTransfers, useWarehouses,
  type TransferStatus, type TransferFilters,
} from '@/hooks/api/use-inventory';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate, formatNumber } from '@/lib/utils';
import { getTransferStatusMeta } from './inventory-format';
import { CreateTransferDialog } from './CreateTransferDialog';
import { Can } from '@/components/shared/Can';

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: TransferStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const headClass = 'text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap';

interface TransfersTabProps {
  onSelect: (transferId: string) => void;
}

export function TransfersTab({ onSelect }: TransfersTabProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [warehouseId, setWarehouseId] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: warehouses } = useWarehouses();

  useEffect(() => {
    setPage(1);
  }, [search, status, warehouseId]);

  const filters = useMemo<TransferFilters>(() => ({
    search: search.trim() || undefined,
    status: status === 'all' ? undefined : (status as TransferStatus),
    warehouseId: warehouseId === 'all' ? undefined : warehouseId,
    page,
    limit: PAGE_SIZE,
  }), [search, status, warehouseId, page]);

  const { data, isLoading, isError, refetch } = useTransfers(filters);

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by transfer code..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger className="w-full lg:w-52">
            <SelectValue placeholder="Warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {(warehouses ?? []).map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Can permission="inventory.transfer">
          <Button onClick={() => setCreateOpen(true)} className="whitespace-nowrap">
            <Plus className="mr-1.5 h-4 w-4" /> New Transfer
          </Button>
        </Can>
      </div>

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load transfers"
          description="Something went wrong while fetching stock transfers. Please try again."
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      ) : isLoading ? (
        <div className="rounded-xl border overflow-hidden">
          <div className="p-4 space-y-3">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-md" />
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No transfers found"
          description="No stock transfers match your filters. Create a transfer to move stock between warehouses."
          action={<Can permission="inventory.transfer"><Button onClick={() => setCreateOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New Transfer</Button></Can>}
        />
      ) : (
        <>
          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/60">
                    <th className={headClass}>Code</th>
                    <th className={headClass}>Route</th>
                    <th className={`${headClass} hidden md:table-cell text-center`}>Items</th>
                    <th className={`${headClass} hidden md:table-cell text-right`}>Qty</th>
                    <th className={headClass}>Status</th>
                    <th className={`${headClass} hidden lg:table-cell`}>Created</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((transfer, idx) => {
                    const meta = getTransferStatusMeta(transfer.status);
                    return (
                      <motion.tr
                        key={transfer.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        onClick={() => onSelect(transfer.id)}
                        className="border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 font-semibold group-hover:text-primary transition-colors whitespace-nowrap">
                          {transfer.code}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-xs">
                            <span className="font-medium truncate max-w-[120px]">{transfer.fromWarehouseName}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate max-w-[120px]">{transfer.toWarehouseName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-center text-muted-foreground">
                          {transfer.itemCount}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-right text-muted-foreground whitespace-nowrap">
                          {formatNumber(transfer.totalQuantity)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn('font-medium', meta.badgeClass)}>{meta.label}</Badge>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                          {formatDate(transfer.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <CreateTransferDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={onSelect} />
    </div>
  );
}
