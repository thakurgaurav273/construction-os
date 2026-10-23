'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Button, Input, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import {
  Search, ChevronLeft, ChevronRight, History, AlertTriangle,
  ArrowDownLeft, ArrowUpRight, SlidersHorizontal,
} from 'lucide-react';
import {
  useTransactions, useWarehouses,
  type InventoryTransactionType, type InventoryTransactionListItem, type TransactionFilters,
} from '@/hooks/api/use-inventory';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import { getTxMeta, txSign } from './inventory-format';

const PAGE_SIZE = 12;

const TX_ICONS: Record<InventoryTransactionType, React.ComponentType<{ className?: string }>> = {
  RECEIVE: ArrowDownLeft,
  RETURN: ArrowDownLeft,
  TRANSFER_IN: ArrowDownLeft,
  ISSUE: ArrowUpRight,
  CONSUMPTION: ArrowUpRight,
  TRANSFER_OUT: ArrowUpRight,
  DAMAGE: AlertTriangle,
  ADJUSTMENT: SlidersHorizontal,
};

const TYPE_OPTIONS: InventoryTransactionType[] = [
  'RECEIVE', 'ISSUE', 'CONSUMPTION', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'RETURN', 'DAMAGE',
];

function TransactionRow({ tx, index }: { tx: InventoryTransactionListItem; index: number }): React.ReactElement {
  const meta = getTxMeta(tx.type);
  const Icon = TX_ICONS[tx.type];
  const subtitle = [tx.warehouseName, tx.reference, tx.note].filter(Boolean).join(' · ');

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-muted/40 transition-colors"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.iconBgClass} shrink-0`}>
        <Icon className={`h-4 w-4 ${meta.accentClass}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{tx.materialName}</p>
          <span className={`text-[11px] font-medium ${meta.accentClass}`}>{meta.label}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {tx.projectName ? `${tx.projectName} · ` : ''}{subtitle || '-'}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${meta.accentClass}`}>
          {txSign(tx.type, tx.quantity)}{formatNumber(Math.abs(tx.quantity))} {tx.unit}
        </p>
        <p className="text-xs text-muted-foreground">{formatRelativeTime(tx.occurredAt)}</p>
      </div>
    </motion.div>
  );
}

export function TransactionsTab(): React.ReactElement {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [warehouseId, setWarehouseId] = useState('all');
  const [page, setPage] = useState(1);

  const { data: warehouses } = useWarehouses();

  useEffect(() => {
    setPage(1);
  }, [search, type, warehouseId]);

  const filters = useMemo<TransactionFilters>(() => ({
    search: search.trim() || undefined,
    type: type === 'all' ? undefined : (type as InventoryTransactionType),
    warehouseId: warehouseId === 'all' ? undefined : warehouseId,
    page,
    limit: PAGE_SIZE,
  }), [search, type, warehouseId, page]);

  const { data, isLoading, isError, refetch } = useTransactions(filters);

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search reference, note, material..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full lg:w-48">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>{getTxMeta(t).label}</SelectItem>
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
      </div>

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load transactions"
          description="Something went wrong while fetching the stock ledger. Please try again."
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={History}
          title="No transactions found"
          description="No stock transactions match the selected filters. Try a different type or warehouse."
        />
      ) : (
        <>
          <div className="space-y-2">
            {items.map((tx, idx) => (
              <TransactionRow key={tx.id} tx={tx} index={idx} />
            ))}
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
    </div>
  );
}
