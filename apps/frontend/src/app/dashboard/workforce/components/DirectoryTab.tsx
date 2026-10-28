'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Button, Input, Badge, Avatar, AvatarFallback,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import {
  Search, Filter, ChevronLeft, ChevronRight,
  Phone, Clock, MoreHorizontal, Eye,
} from 'lucide-react';
import type { Worker } from '@/hooks/api/use-workforce';
import { ATTENDANCE_STATUS_STYLES, type AttendanceDisplayStatus } from '@/features/workforce/constants';
import { knownTrades } from '@/features/workforce/utils/trades';
import { AttendanceStatusLabel } from '@/features/workforce/components/AttendanceStatusLabel';
import {
  attendanceRateTone, avatarColorFor, formatLastOnSite, toDisplayStatus,
} from '@/features/workforce/utils/attendance';
import { MobileCard, MobileCardList, useIncrementalItems } from '@/components/shared/MobileList';

const PAGE_SIZE = 15;

const STATUS_FILTERS: AttendanceDisplayStatus[] = ['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'ON_LEAVE', 'NOT_MARKED'];

interface DirectoryTabProps {
  workers: Worker[];
  onSelectWorker: (worker: Worker) => void;
}

export function DirectoryTab({ workers, onSelectWorker }: DirectoryTabProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tradeFilter, setTradeFilter] = useState<string>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const tradeOptions = useMemo(() => knownTrades(workers), [workers]);

  const filtered = useMemo(() => {
    return workers.filter((w) => {
      const matchesSearch =
        !search ||
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.role.toLowerCase().includes(search.toLowerCase()) ||
        w.trade.toLowerCase().includes(search.toLowerCase()) ||
        (w.project ?? '').toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === 'all' || toDisplayStatus(w.todayStatus) === statusFilter;
      const matchesTrade = tradeFilter === 'all' || w.trade === tradeFilter;

      return (showInactive || w.isActive) && matchesSearch && matchesStatus && matchesTrade;
    });
  }, [workers, search, statusFilter, tradeFilter, showInactive]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  const phoneList = useIncrementalItems(filtered, `${search}|${statusFilter}|${tradeFilter}|${showInactive}`);

  const resetPage = useCallback(() => setPage(1), []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setSearch(e.target.value);
    resetPage();
  }

  function handleStatusChange(val: string): void {
    setStatusFilter(val);
    resetPage();
  }

  function handleTradeChange(val: string): void {
    setTradeFilter(val);
    resetPage();
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, role, trade, project..."
            className="pl-9"
            value={search}
            onChange={handleSearchChange}
          />
        </div>

        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Today" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {STATUS_FILTERS.map((status) => (
              <SelectItem key={status} value={status}>{ATTENDANCE_STATUS_STYLES[status].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={tradeFilter} onValueChange={handleTradeChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Trade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Trades</SelectItem>
            {tradeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <label className="flex items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-primary"
            checked={showInactive}
            onChange={(e) => { setShowInactive(e.target.checked); resetPage(); }}
          />
          Include inactive
        </label>
      </div>

      <p className="text-sm text-muted-foreground">
        <span className="md:hidden">{filtered.length} workers</span>
        <span className="hidden md:inline">Showing {paginated.length} of {filtered.length} workers</span>
      </p>

      <MobileCardList
        items={phoneList.visible}
        getKey={(worker) => worker.id}
        hasMore={phoneList.hasMore}
        onLoadMore={phoneList.loadMore}
        empty={<div className="rounded-xl border py-16 text-center text-sm text-muted-foreground">No workers match your filters.</div>}
        renderCard={(worker) => (
          <MobileCard
            onClick={() => onSelectWorker(worker)}
            title={worker.name}
            subtitle={(
              <>
                {worker.role}
                {!worker.isActive && <span className="ml-1.5 text-destructive">· Inactive</span>}
              </>
            )}
            aside={<AttendanceStatusLabel status={worker.todayStatus} />}
            meta={[
              { label: 'Trade', value: worker.trade },
              { label: 'Project', value: worker.project ?? 'Not assigned' },
            ]}
          />
        )}
      />

      {/* Table */}
      <div className="hidden rounded-xl border overflow-hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Worker</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell">Trade</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">Project</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden xl:table-cell">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap">Today</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden lg:table-cell">Exp</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden md:table-cell" title="Last 30 days">Att %</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap hidden xl:table-cell">Last on Site</th>
                <th className="px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-muted-foreground">
                    No workers match your filters.
                  </td>
                </tr>
              ) : (
                paginated.map((worker, idx) => (
                  <motion.tr
                    key={worker.id}
                    initial={false}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => onSelectWorker(worker)}
                    className="border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className={`h-8 w-8 shrink-0 ${avatarColorFor(worker.id)} text-white`}>
                          <AvatarFallback className={`${avatarColorFor(worker.id)} text-white text-xs font-bold`}>
                            {worker.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium group-hover:text-primary transition-colors whitespace-nowrap">{worker.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {worker.role}
                            {!worker.isActive && <span className="ml-1.5 text-destructive">· Inactive</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="secondary" className="text-xs whitespace-nowrap">{worker.trade}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground max-w-[160px] truncate">{worker.project ?? 'Not assigned'}</p>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        <span className="whitespace-nowrap">{worker.phone ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <AttendanceStatusLabel status={worker.todayStatus} />
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {worker.experienceYears} yr
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-semibold ${attendanceRateTone(worker.attendanceRate)}`}>
                        {worker.attendanceRate === null ? '—' : `${worker.attendanceRate}%`}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 shrink-0" />
                        <span className="whitespace-nowrap">{formatLastOnSite(worker)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                        aria-label={`View ${worker.name}`}
                        onClick={(e) => { e.stopPropagation(); onSelectWorker(worker); }}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="hidden items-center justify-between md:flex">
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
