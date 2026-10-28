import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { MaterialRequest } from '@/hooks/api/use-material-requests';
import { formatDate } from '@/lib/utils';
import { MobileCard, MobileCardList } from '@/components/shared/MobileList';
import { MaterialRequestStatusBadge } from './MaterialRequestStatusBadge';

const headClass = 'text-left px-4 py-3 font-medium text-muted-foreground whitespace-nowrap';

interface MaterialRequestsTableProps {
  requests: MaterialRequest[];
  onSelect: (requestId: string) => void;
  /** The project column only helps when requests from several projects are listed together. */
  showProject?: boolean;
  /** Every page loaded so far, when the caller pages the list; phones scroll through these instead of `requests`. */
  phoneRequests?: readonly MaterialRequest[];
  hasMore?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

function describeMaterials(request: MaterialRequest): string {
  const [first, ...rest] = request.items;
  if (!first) return '—';
  return rest.length === 0 ? first.name : `${first.name} +${rest.length} more`;
}

function describeProgress(request: MaterialRequest): string {
  const done = request.items.filter((item) => item.remaining === 0).length;
  return `${done} of ${request.items.length} issued`;
}

export function MaterialRequestsTable({
  requests, onSelect, showProject = false, phoneRequests, hasMore, onLoadMore, isLoadingMore,
}: MaterialRequestsTableProps): React.ReactElement {
  return (
    <>
      <MobileCardList
        items={phoneRequests ?? requests}
        getKey={(request) => request.id}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        isLoadingMore={isLoadingMore}
        renderCard={(request) => (
          <MobileCard
            onClick={() => onSelect(request.id)}
            title={request.code}
            subtitle={describeMaterials(request)}
            aside={<MaterialRequestStatusBadge status={request.status} />}
            meta={[
              ...(showProject ? [{ label: 'Project', value: request.project.name }] : []),
              { label: 'Needed by', value: request.neededBy ? formatDate(request.neededBy) : '—' },
              { label: 'Requested by', value: request.requestedBy.name },
              { label: 'Raised', value: formatDate(request.createdAt) },
            ]}
          />
        )}
      />
      {/* While a later page loads on phones there is no current page for the desktop table to show. */}
      {requests.length > 0 && (
        <div className="hidden md:block rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/60">
                  <th className={headClass}>Request</th>
                  <th className={`${headClass} hidden sm:table-cell`}>Materials</th>
                  {showProject && <th className={`${headClass} hidden md:table-cell`}>Project</th>}
                  <th className={`${headClass} hidden lg:table-cell`}>Requested by</th>
                  <th className={`${headClass} hidden sm:table-cell`}>Needed by</th>
                  <th className={headClass}>Status</th>
                  <th className="px-4 py-3 w-10"><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr
                    key={request.id}
                    onClick={() => onSelect(request.id)}
                    className="border-b last:border-0 hover:bg-muted/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); onSelect(request.id); }}
                        className="font-semibold group-hover:text-primary transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {request.code}
                      </button>
                      <p className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</p>
                      <p className="sm:hidden text-xs text-muted-foreground truncate max-w-[180px]">{describeMaterials(request)}</p>
                    </td>
                    <td className="px-4 py-3 max-w-[220px] hidden sm:table-cell">
                      <p className="truncate">{describeMaterials(request)}</p>
                      {(request.status === 'PARTLY_ISSUED' || request.status === 'CLOSED') && (
                        <p className="text-xs text-muted-foreground">{describeProgress(request)}</p>
                      )}
                    </td>
                    {showProject && (
                      <td className="px-4 py-3 hidden md:table-cell max-w-[180px] truncate text-muted-foreground">{request.project.name}</td>
                    )}
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground whitespace-nowrap">{request.requestedBy.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-muted-foreground whitespace-nowrap">
                      {request.neededBy ? formatDate(request.neededBy) : '—'}
                    </td>
                    <td className="px-4 py-3"><MaterialRequestStatusBadge status={request.status} /></td>
                    <td className="px-4 py-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
