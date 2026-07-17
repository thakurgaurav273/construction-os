'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Button, Input, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import {
  Search, Filter, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown,
  Eye, Package, PackageSearch, AlertTriangle,
} from 'lucide-react';
import {
  useMaterials, useMaterialCategories, useMaterialSuppliers,
  type MaterialListItem, type MaterialStatus, type MaterialFilters,
} from '@/hooks/api/use-materials';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatDate, formatNumber } from '@/lib/utils';
import { MaterialStatusBadge } from './MaterialStatusBadge';

const PAGE_SIZE = 10;

type SortKey = 'name' | 'available' | 'reserved' | 'minStock' | 'updatedAt';

const STATUS_OPTIONS: { value: MaterialStatus; label: string }[] = [
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'LOW_STOCK', label: 'Low Stock' },
  { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
  { value: 'OVERSTOCKED', label: 'Overstocked' },
];

interface MaterialsTableProps {
  onSelect: (materialId: string) => void;
}

const headClass = 'text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap';

function MaterialThumb({ material }: { material: MaterialListItem }): React.ReactElement {
  if (material.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={material.imageUrl}
        alt={material.name}
        className="h-9 w-9 rounded-md object-cover border shrink-0"
      />
    );
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-muted/50 shrink-0">
      <Package className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

export function MaterialsTable({ onSelect }: MaterialsTableProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [supplierId, setSupplierId] = useState('all');
  const [status, setStatus] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('updatedAt');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const { data: categories } = useMaterialCategories();
  const { data: suppliers } = useMaterialSuppliers();

  useEffect(() => {
    setPage(1);
  }, [search, categoryId, supplierId, status, lowStockOnly, sort, order]);

  const filters = useMemo<MaterialFilters>(() => ({
    search: search.trim() || undefined,
    categoryId: categoryId === 'all' ? undefined : categoryId,
    supplierId: supplierId === 'all' ? undefined : supplierId,
    status: status === 'all' ? undefined : (status as MaterialStatus),
    lowStock: lowStockOnly || undefined,
    sort,
    order,
    page,
    limit: PAGE_SIZE,
  }), [search, categoryId, supplierId, status, lowStockOnly, sort, order, page]);

  const { data, isLoading, isError, refetch } = useMaterials(filters);

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
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-full lg:w-44">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {(categories ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="Supplier" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Suppliers</SelectItem>
            {(suppliers ?? []).map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
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
          title="Unable to load materials"
          description="Something went wrong while fetching the catalogue. Check your connection and try again."
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
          icon={PackageSearch}
          title="No materials found"
          description="No materials match your current filters. Try clearing the search or adjusting the filters above."
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Showing {items.length} of {formatNumber(total)} materials
          </p>

          <div className="rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/60">
                    <th className={headClass}>
                      <button
                        type="button"
                        onClick={() => handleSort('name')}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Material <SortIcon column="name" />
                      </button>
                    </th>
                    <th className={`${headClass} hidden lg:table-cell`}>Category</th>
                    <th className={`${headClass} hidden xl:table-cell text-center`}>Projects</th>
                    <th className={`${headClass} hidden lg:table-cell`}>Supplier</th>
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
                        onClick={() => handleSort('minStock')}
                        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                      >
                        Min Stock <SortIcon column="minStock" />
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
                  {items.map((material, idx) => (
                    <motion.tr
                      key={material.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => onSelect(material.id)}
                      className="border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <MaterialThumb material={material} />
                          <div className="min-w-0">
                            <p className="font-semibold group-hover:text-primary transition-colors truncate max-w-[220px]">
                              {material.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{material.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {material.categoryName ?? '-'}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-center text-muted-foreground">
                        {material.projectCount}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">
                        <span className="max-w-[160px] truncate inline-block align-middle">
                          {material.supplierName ?? '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                        {formatNumber(material.available)}
                        <span className="text-xs font-normal text-muted-foreground"> {material.unit}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-right text-muted-foreground whitespace-nowrap">
                        {formatNumber(material.reserved)}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-right text-muted-foreground whitespace-nowrap">
                        {formatNumber(material.minStock)}
                      </td>
                      <td className="px-4 py-3">
                        <MaterialStatusBadge status={material.status} />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(material.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(material.id);
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
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
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
        </>
      )}
    </div>
  );
}
