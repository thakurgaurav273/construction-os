'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Button, Input, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import {
  Search, Filter, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown,
  Eye, PackageSearch, AlertTriangle,
} from 'lucide-react';
import {
  useInventoryItems, useWarehouses,
  type InventoryStatus, type InventoryItemFilters,
} from '@/hooks/api/use-inventory';
import { EmptyState } from '@/components/shared/EmptyState';
import { MobileCard, MobileCardList, useAccumulatedPages } from '@/components/shared/MobileList';
import { formatDate, formatNumber } from '@/lib/utils';
import { formatCompactINR } from './inventory-format';
import { InventoryStatusBadge } from './InventoryStatusBadge';

const PAGE_SIZE = 10;

type SortKey = 'materialName' | 'available' | 'reserved' | 'reorderLevel' | 'value' | 'updatedAt';

const STATUS_OPTIONS: { value: InventoryStatus; label: string }[] = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
  { value: 'OVERSTOCKED', label: 'Overstocked' },
];

interface InventoryItemsTabProps {
  onSelect: (itemId: string) => void;
}

const headClass = 'text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap';

export function InventoryItemsTab({ onSelect }: InventoryItemsTabProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [warehouseId, setWarehouseId] = useState('all');
  const [status, setStatus] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('materialName');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);

  const { data: warehouses } = useWarehouses();

  useEffect(() => {
    setPage(1);
  }, [search, warehouseId, status, lowStockOnly, sort, order]);

  const filters = useMemo<InventoryItemFilters>(() => ({
    search: search.trim() || undefined,
    warehouseId: warehouseId === 'all' ? undefined : warehouseId,
    status: status === 'all' ? undefined : (status as InventoryStatus),
    lowStock: lowStockOnly || undefined,
    sort,
    order,
    page,
    limit: PAGE_SIZE,
  }), [search, warehouseId, status, lowStockOnly, sort, order, page]);

  const { data, isLoading, isError, refetch } = useInventoryItems(filters);
  const listKey = [search, warehouseId, status, lowStockOnly, sort, order].join('|');
  const phoneItems = useAccumulatedPages({ items: data?.items, page, resetKey: listKey });

  function handleSort(key: SortKey): void {
    if (key === sort) {
      setOrder((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key);
      setOrder('asc');
    }
  }

  function SortIcon({ column }: { column: SortKey }): React.ReactElement {
    if (column !== sort) return <ChevronsUpDown className="h-3 w-3 opacity-40" />;
    return order === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  const loadingSkeleton = (
    <div className="rounded-xl border overflow-hidden">
      <div className="p-4 space-y-3">
        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full rounded-md" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search materials, SKU..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={warehouseId} onValueChange={setWarehouseId}>
          <SelectTrigger className="w-full lg:w-52">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Warehouse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Warehouses</SelectItem>
            {(warehouses ?? []).map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={lowStockOnly ? 'default' : 'outline'}
          onClick={() => setLowStockOnly((v) => !v)}
          className="lg:w-auto whitespace-nowrap"
        >
          <AlertTriangle className="mr-1.5 h-4 w-4" /> Low stock
        </Button>
      </div>

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load inventory"
          description="Something went wrong while fetching stock levels. Check your connection and try again."
          action={<Button onClick={() => refetch()}>Retry</Button>}
        />
      ) : isLoading && phoneItems.length === 0 ? (
        loadingSkeleton
      ) : !isLoading && items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No stock found"
          description="No inventory items match your current filters. Try clearing the search or adjusting the filters above."
        />
      ) : (
        <>
          <MobileCardList
            items={phoneItems}
            getKey={(item) => item.id}
            hasMore={page < totalPages}
            onLoadMore={() => setPage((current) => current + 1)}
            isLoadingMore={isLoading}
            renderCard={(item) => (
              <MobileCard
                onClick={() => onSelect(item.id)}
                title={item.materialName}
                subtitle={`${item.sku} · ${item.warehouseName}`}
                aside={<InventoryStatusBadge status={item.status} />}
                meta={[
                  { label: 'Available', value: `${formatNumber(item.available)} ${item.unit}` },
                  { label: 'Reserved', value: formatNumber(item.reserved) },
                  { label: 'Reorder', value: formatNumber(item.reorderLevel) },
                  { label: 'Value', value: formatCompactINR(item.value) },
                ]}
              />
            )}
          />

          {/* A later page loading on phones keeps the cards above; the desktop table shows one page at a time. */}
          {isLoading ? <div className="hidden md:block">{loadingSkeleton}</div> : (
            <div className="hidden md:block space-y-4">
              <p className="text-sm text-muted-foreground">
                Showing {items.length} of {formatNumber(total)} items
              </p>

              <div className="rounded-xl border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/60">
                        <th className={headClass}>
                          <button
                            type="button"
                            onClick={() => handleSort('materialName')}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            Material <SortIcon column="materialName" />
                          </button>
                        </th>
                        <th className={`${headClass} hidden lg:table-cell`}>Warehouse</th>
                        <th className={`${headClass} hidden lg:table-cell`}>Category</th>
                        <th className={`${headClass} text-right`}>
                          <button
                            type="button"
                            onClick={() => handleSort('available')}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            Available <SortIcon column="available" />
                          </button>
                        </th>
                        <th className={`${headClass} hidden md:table-cell text-right`}>
                          <button
                            type="button"
                            onClick={() => handleSort('reserved')}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            Reserved <SortIcon column="reserved" />
                          </button>
                        </th>
                        <th className={`${headClass} hidden xl:table-cell text-right`}>
                          <button
                            type="button"
                            onClick={() => handleSort('reorderLevel')}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            Reorder <SortIcon column="reorderLevel" />
                          </button>
                        </th>
                        <th className={`${headClass} hidden xl:table-cell text-right`}>
                          <button
                            type="button"
                            onClick={() => handleSort('value')}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            Value <SortIcon column="value" />
                          </button>
                        </th>
                        <th className={headClass}>Status</th>
                        <th className={`${headClass} hidden lg:table-cell`}>
                          <button
                            type="button"
                            onClick={() => handleSort('updatedAt')}
                            className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            Updated <SortIcon column="updatedAt" />
                          </button>
                        </th>
                        <th className="px-4 py-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <motion.tr
                          key={item.id}
                          initial={false}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => onSelect(item.id)}
                          className="border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer group"
                        >
                          <td className="px-4 py-3">
                            <div className="min-w-0">
                              <p className="font-semibold group-hover:text-primary transition-colors truncate max-w-[220px]">
                                {item.materialName}
                              </p>
                              <p className="text-xs text-muted-foreground">{item.sku}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                            {item.warehouseName}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                            {item.categoryName ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                            {formatNumber(item.available)}
                            <span className="text-xs font-normal text-muted-foreground"> {item.unit}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-right text-muted-foreground whitespace-nowrap">
                            {formatNumber(item.reserved)}
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell text-right text-muted-foreground whitespace-nowrap">
                            {formatNumber(item.reorderLevel)}
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell text-right text-muted-foreground whitespace-nowrap">
                            {formatCompactINR(item.value)}
                          </td>
                          <td className="px-4 py-3">
                            <InventoryStatusBadge status={item.status} />
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(item.updatedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelect(item.id);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </motion.tr>
                      ))}
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
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
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
                      disabled={page === totalPages}
                      className="h-8 w-8 p-0"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
