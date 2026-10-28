'use client';

import React, { useMemo, useState } from 'react';
import {
  Button, Input, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import { AlertTriangle, ChevronLeft, ChevronRight, ClipboardList, Plus, Search } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { Can } from '@/components/shared/Can';
import { useAccumulatedPages } from '@/components/shared/MobileList';
import { useProjects } from '@/hooks/api/use-projects';
import {
  useMaterialRequests, type MaterialRequestFilters, type MaterialRequestStatus, type MaterialRequestStatusFilter,
} from '@/hooks/api/use-material-requests';
import { MaterialRequestDialog } from '@/features/materials/components/MaterialRequestDialog';
import { MaterialRequestDrawer } from '@/features/materials/components/MaterialRequestDrawer';
import { MaterialRequestsTable } from '@/features/materials/components/MaterialRequestsTable';
import { materialRequestStatusLabel } from '@/features/materials/components/MaterialRequestStatusBadge';

const PAGE_SIZE = 10;
const ALL = 'all';
const STATUSES: MaterialRequestStatus[] = ['PENDING', 'APPROVED', 'PARTLY_ISSUED', 'ISSUED', 'REJECTED', 'CANCELLED', 'CLOSED'];

type StatusChoice = MaterialRequestStatusFilter | typeof ALL;

function toStatusChoice(value: string): StatusChoice {
  if (value === 'OPEN' || value === ALL) return value;
  return STATUSES.find((status) => status === value) ?? 'OPEN';
}

/** Every site's requests in one queue, open ones first, so the stores see what is waiting on them. */
export function RequestsTab(): React.ReactElement {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusChoice>('OPEN');
  const [projectId, setProjectId] = useState(ALL);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const { data: projects = [] } = useProjects();

  const filters = useMemo<MaterialRequestFilters>(() => ({
    search: search.trim() || undefined,
    status: status === ALL ? undefined : status,
    projectId: projectId === ALL ? undefined : projectId,
    page,
    limit: PAGE_SIZE,
  }), [search, status, projectId, page]);
  const { data, isLoading, isError, refetch } = useMaterialRequests(filters);
  const requests = data?.items ?? [];
  const phoneRequests = useAccumulatedPages({ items: data?.items, page, resetKey: [search, status, projectId].join('|') });
  const totalPages = data?.totalPages ?? 1;
  const isFiltered = filters.search !== undefined || projectId !== ALL || status !== 'OPEN';


  const createButton = (
    <Can permission="material.request">
      <Button onClick={() => setCreateOpen(true)} className="whitespace-nowrap">
        <Plus className="mr-1.5 h-4 w-4" /> Request Material
      </Button>
    </Can>
  );

  const loadingSkeleton = (
    <div className="rounded-xl border p-4 space-y-3">
      {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-11 w-full rounded-md" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by request code or material..."
            aria-label="Search material requests"
            className="pl-9"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          />
        </div>
        <Select value={status} onValueChange={(value) => { setStatus(toStatusChoice(value)); setPage(1); }}>
          <SelectTrigger className="w-full lg:w-44" aria-label="Status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value={ALL}>All Status</SelectItem>
            {STATUSES.map((value) => (
              <SelectItem key={value} value={value}>{materialRequestStatusLabel(value)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectId} onValueChange={(value) => { setProjectId(value); setPage(1); }}>
          <SelectTrigger className="w-full lg:w-52" aria-label="Project"><SelectValue placeholder="Project" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {createButton}
      </div>

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load material requests"
          description="Check your connection and try again."
          action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
        />
      ) : isLoading && phoneRequests.length === 0 ? (
        loadingSkeleton
      ) : !isLoading && requests.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={isFiltered ? 'No requests match these filters' : 'No open material requests'}
          description={isFiltered
            ? 'Try another status or project.'
            : 'Sites raise requests here when they need material; the stores approve and issue them.'}
          action={isFiltered ? undefined : createButton}
        />
      ) : (
        <>
          {/* A later page loading on phones keeps the cards; the desktop table shows one page at a time. */}
          {isLoading && <div className="hidden md:block">{loadingSkeleton}</div>}
          <MaterialRequestsTable
            requests={requests}
            onSelect={setSelectedId}
            showProject
            phoneRequests={phoneRequests}
            hasMore={page < totalPages}
            onLoadMore={() => setPage((current) => current + 1)}
            isLoadingMore={isLoading}
          />
          {totalPages > 1 && (
            <div className="hidden md:flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" aria-label="Previous page" className="h-8 w-8 p-0"
                  onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" aria-label="Next page" className="h-8 w-8 p-0"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <MaterialRequestDrawer requestId={selectedId} onClose={() => setSelectedId(null)} />
      <MaterialRequestDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={setSelectedId} />
    </div>
  );
}
