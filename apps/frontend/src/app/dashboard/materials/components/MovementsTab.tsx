'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Button, Skeleton,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@sitepilot/ui';
import {
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, SlidersHorizontal,
  ChevronLeft, ChevronRight, History, AlertTriangle,
} from 'lucide-react';
import {
  useMaterialMovements, useMaterials,
  type MovementType, type MaterialMovement,
} from '@/hooks/api/use-materials';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import { getMovementMeta } from './materials-format';

const PAGE_SIZE = 12;

const MOVEMENT_ICONS: Record<MovementType, React.ComponentType<{ className?: string }>> = {
  inbound: ArrowDownLeft,
  outbound: ArrowUpRight,
  consumption: ArrowUpRight,
  transfer: ArrowLeftRight,
  adjustment: SlidersHorizontal,
};

const TYPE_OPTIONS: { value: MovementType; label: string }[] = [
  { value: 'inbound', label: 'Inbound' },
  { value: 'outbound', label: 'Outbound' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'consumption', label: 'Consumption' },
  { value: 'adjustment', label: 'Adjustment' },
];

interface ProjectOption {
  id: string;
  name: string;
}

function collectProjects(movements: MaterialMovement[]): ProjectOption[] {
  const map = new Map<string, string>();
  for (const movement of movements) {
    if (movement.project) map.set(movement.project.id, movement.project.name);
  }
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}

function MovementRow({ movement, index }: { movement: MaterialMovement; index: number }): React.ReactElement {
  const meta = getMovementMeta(movement.type);
  const Icon = MOVEMENT_ICONS[movement.type];
  const unit = movement.material?.unit ?? '';
  const subtitle = [movement.reference, movement.note].filter(Boolean).join(' · ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 hover:bg-muted/40 transition-colors"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${meta.iconBgClass} shrink-0`}>
        <Icon className={`h-4 w-4 ${meta.accentClass}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{movement.material?.name ?? 'Material'}</p>
          <span className={`text-[11px] font-medium ${meta.accentClass}`}>{meta.label}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {movement.project ? `${movement.project.name}${subtitle ? ' · ' : ''}` : ''}{subtitle || (!movement.project ? '-' : '')}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold ${meta.accentClass}`}>
          {meta.isInbound ? '+' : '−'}{formatNumber(movement.quantity)}{unit ? ` ${unit}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">{formatRelativeTime(movement.occurredAt)}</p>
      </div>
    </motion.div>
  );
}

export function MovementsTab(): React.ReactElement {
  const [type, setType] = useState('all');
  const [materialId, setMaterialId] = useState('all');
  const [projectId, setProjectId] = useState('all');
  const [page, setPage] = useState(1);

  const { data: materialsData } = useMaterials({ limit: 100, sort: 'name', order: 'asc' });
  // Unfiltered sample used purely to populate the project dropdown with real projects.
  const { data: projectSample } = useMaterialMovements({ limit: 100 });
  const projectOptions = useMemo(() => collectProjects(projectSample?.items ?? []), [projectSample]);

  useEffect(() => {
    setPage(1);
  }, [type, materialId, projectId]);

  const { data, isLoading, isError, refetch } = useMaterialMovements({
    type: type === 'all' ? undefined : type,
    materialId: materialId === 'all' ? undefined : materialId,
    projectId: projectId === 'all' ? undefined : projectId,
    page,
    limit: PAGE_SIZE,
  });

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full lg:w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={materialId} onValueChange={setMaterialId}>
          <SelectTrigger className="w-full lg:w-56">
            <SelectValue placeholder="Material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Materials</SelectItem>
            {(materialsData?.items ?? []).map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-full lg:w-56">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectOptions.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <EmptyState
          icon={AlertTriangle}
          title="Unable to load movements"
          description="Something went wrong while fetching stock movements. Please try again."
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
          title="No movements found"
          description="No stock movements match the selected filters. Try a different type, material, or project."
        />
      ) : (
        <>
          <div className="space-y-2">
            {items.map((movement, idx) => (
              <MovementRow key={movement.id} movement={movement} index={idx} />
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
