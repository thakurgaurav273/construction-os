'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, ClipboardList } from 'lucide-react';
import { useMaterialRequests } from '@/hooks/api/use-material-requests';
import { MaterialRequestDrawer } from './MaterialRequestDrawer';
import { MaterialRequestsTable } from './MaterialRequestsTable';

const LIMIT = 10;

interface ProjectMaterialRequestsProps {
  projectId: string;
  /** Opens the request dialog; absent when the member can't request or the project is archived. */
  onRequest?: () => void;
}

/**
 * The site's material requests on its Materials tab: open ones by default, with the full history a click
 * away. Notifications link here with `?request=<id>`, which opens that request.
 */
export function ProjectMaterialRequests({ projectId, onRequest }: ProjectMaterialRequestsProps): React.ReactElement | null {
  const router = useRouter();
  const pathname = usePathname();
  const linkedRequestId = useSearchParams().get('request');
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(linkedRequestId);
  const { data, isLoading, isError, refetch } = useMaterialRequests({
    projectId, status: showAll ? undefined : 'OPEN', limit: LIMIT,
  });
  // A notification clicked while this page is already open changes only the query string.
  useEffect(() => {
    if (linkedRequestId) setSelectedId(linkedRequestId);
  }, [linkedRequestId]);
  const { data: anyRequests } = useMaterialRequests({ projectId, limit: 1 }, { enabled: !showAll && data?.total === 0 });

  function closeDrawer(): void {
    setSelectedId(null);
    if (linkedRequestId) router.replace(pathname, { scroll: false });
  }

  const requests = data?.items ?? [];
  const hasHistory = showAll || (data?.total ?? 0) > 0 || (anyRequests?.total ?? 0) > 0;
  // Sites that have never used requests and can't raise one don't need an empty section.
  if (!isLoading && !isError && requests.length === 0 && !hasHistory && !onRequest) {
    return <MaterialRequestDrawer requestId={selectedId} onClose={closeDrawer} />;
  }

  return (
    <section className="rounded-xl border bg-card p-4 space-y-3" aria-labelledby="material-requests-heading">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id="material-requests-heading" className="text-sm font-semibold">Material Requests</h3>
          <p className="text-xs text-muted-foreground">
            {showAll ? 'Every request this site has raised.' : 'Waiting for approval or still to be issued.'}
          </p>
        </div>
        {hasHistory && (
          <Button variant="ghost" size="sm" onClick={() => setShowAll((current) => !current)}>
            {showAll ? 'Show open only' : 'Show all'}
          </Button>
        )}
      </div>

      {isError ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed p-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-red-500" /> Unable to load material requests.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, index) => <Skeleton key={index} className="h-11 w-full rounded-md" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center">
          <ClipboardList className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {showAll ? 'This site hasn’t requested any material yet.' : 'No open requests. Everything asked for has been dealt with.'}
          </p>
          {onRequest && <Button size="sm" variant="outline" onClick={onRequest}>Request Material</Button>}
        </div>
      ) : (
        <>
          <MaterialRequestsTable requests={requests} onSelect={setSelectedId} />
          {(data?.total ?? 0) > LIMIT && (
            <p className="text-xs text-muted-foreground">
              Showing the latest {LIMIT} of {data?.total}. The Requests tab under Materials lists them all.
            </p>
          )}
        </>
      )}

      <MaterialRequestDrawer requestId={selectedId} onClose={closeDrawer} />
    </section>
  );
}
