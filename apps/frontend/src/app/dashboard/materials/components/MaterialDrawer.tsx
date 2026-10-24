'use client';

import React from 'react';
import {
  Badge, Progress, ScrollArea, Skeleton,
  Sheet, SheetContent, SheetTitle,
} from '@sitepilot/ui';
import {
  Package, X, Star, Phone, Mail, User, Truck, Clock, FileText,
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, SlidersHorizontal, AlertTriangle,
} from 'lucide-react';
import {
  useMaterial, type MaterialDetail, type MovementType,
} from '@/hooks/api/use-materials';
import { formatNumber, formatRelativeTime } from '@/lib/utils';
import {
  formatCurrency, formatCompactINR, getMovementMeta,
} from './materials-format';
import { MaterialStatusBadge } from './MaterialStatusBadge';
import { MaterialDrawerActions } from './MaterialDrawerActions';
import { MaterialStoresCard } from './MaterialStoresCard';
import { RecordHistory } from '@/features/audit/components/RecordHistory';

interface MaterialDrawerProps {
  materialId: string | null;
  open: boolean;
  onClose: () => void;
}

const MOVEMENT_ICONS: Record<MovementType, React.ComponentType<{ className?: string }>> = {
  inbound: ArrowDownLeft,
  outbound: ArrowUpRight,
  consumption: ArrowUpRight,
  transfer: ArrowLeftRight,
  adjustment: SlidersHorizontal,
};

interface StatProps {
  label: string;
  value: string;
  accentClass?: string;
}

function Stat({ label, value, accentClass = '' }: StatProps): React.ReactElement {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${accentClass}`}>{value}</p>
    </div>
  );
}

function DrawerSkeleton(): React.ReactElement {
  return (
    <div className="p-5 space-y-4">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}

function MaterialThumb({ material }: { material: MaterialDetail }): React.ReactElement {
  if (material.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={material.imageUrl}
        alt={material.name}
        className="h-14 w-14 rounded-xl object-cover border shrink-0"
      />
    );
  }
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl border bg-muted/50 shrink-0">
      <Package className="h-6 w-6 text-muted-foreground" />
    </div>
  );
}

function MaterialDrawerBody({ material, onClose }: { material: MaterialDetail; onClose: () => void }): React.ReactElement {
  const specs = material.specifications ? Object.entries(material.specifications) : [];
  const recentMovements = material.movements.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <div className="shrink-0 border-b bg-muted/30 px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <MaterialThumb material={material} />
          <div className="min-w-0">
            <h3 className="text-lg font-semibold leading-tight truncate">{material.name}</h3>
            <p className="text-xs text-muted-foreground">{material.sku}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <MaterialStatusBadge status={material.status} />
              {material.categoryName && (
                <Badge variant="secondary" className="text-xs">{material.categoryName}</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-5 space-y-5">
          {/* Stock stats */}
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Available" value={`${formatNumber(material.available)} ${material.unit}`} accentClass="text-primary" />
            <Stat label="Reserved" value={`${formatNumber(material.reserved)} ${material.unit}`} />
            <Stat label="Incoming" value={`${formatNumber(material.incoming)} ${material.unit}`} />
            <Stat label="Unit Cost" value={formatCurrency(material.unitCost)} />
            <Stat label="Min / Max" value={`${formatNumber(material.minStock)} / ${material.maxStock !== null ? formatNumber(material.maxStock) : '-'}`} />
            <Stat label="Stock Value" value={formatCompactINR(material.stockValue)} />
          </div>

          <MaterialStoresCard material={material} />

          {/* Specifications */}
          {specs.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" /> Specifications
              </h4>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                {specs.map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-2 border-b border-dashed last:border-0 sm:last:border-b py-1">
                    <dt className="text-xs text-muted-foreground capitalize">{key}</dt>
                    <dd className="text-xs font-medium text-right">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Recent movements */}
          <div className="rounded-xl border bg-card p-4">
            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" /> Recent Movements
            </h4>
            {recentMovements.length === 0 ? (
              <p className="text-xs text-muted-foreground">No stock movements recorded yet.</p>
            ) : (
              <div className="space-y-1">
                {recentMovements.map((movement) => {
                  const meta = getMovementMeta(movement.type);
                  const Icon = MOVEMENT_ICONS[movement.type];
                  return (
                    <div key={movement.id} className="flex items-center gap-3 py-1.5 border-b border-dashed last:border-0">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.iconBgClass} shrink-0`}>
                        <Icon className={`h-4 w-4 ${meta.accentClass}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{meta.label}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {movement.project?.name ?? movement.reference ?? movement.note ?? '-'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-semibold ${meta.accentClass}`}>
                          {meta.isInbound ? '+' : '−'}{formatNumber(movement.quantity)} {material.unit}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(movement.occurredAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Supplier */}
          {material.supplier && (
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <User className="h-4 w-4 text-muted-foreground" /> Supplier
              </h4>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium">{material.supplier.name}</p>
                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-semibold">{material.supplier.rating.toFixed(1)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                {material.supplier.contactName && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <User className="h-3.5 w-3.5" /> {material.supplier.contactName}
                  </div>
                )}
                {material.supplier.phone && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {material.supplier.phone}
                  </div>
                )}
                {material.supplier.email && (
                  <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 truncate">
                    <Mail className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{material.supplier.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" /> {material.supplier.leadTimeDays}d lead time
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" /> {material.supplier.onTimeRate}% on-time
                </div>
              </div>
            </div>
          )}

          {/* Projects */}
          {material.projects.length > 0 && (
            <div className="rounded-xl border bg-card p-4">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-3">
                <Package className="h-4 w-4 text-muted-foreground" /> Projects Using This Material
              </h4>
              <div className="space-y-3">
                {material.projects.map((project) => {
                  const percent = project.allocated > 0
                    ? Math.min(100, Math.round((project.consumed / project.allocated) * 100))
                    : 0;
                  return (
                    <div key={project.projectId}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{project.projectName}</p>
                          <p className="text-xs text-muted-foreground">{project.projectCode}</p>
                        </div>
                        <span className="text-xs font-semibold shrink-0">
                          {project.allocated > 0
                            ? `${formatNumber(project.consumed)} / ${formatNumber(project.allocated)} ${material.unit}`
                            : `${formatNumber(project.consumed)} ${material.unit} issued`}
                        </span>
                      </div>
                      <Progress value={percent} className="h-1.5" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <RecordHistory entityType="material" entityId={material.id} />
        </div>
      </ScrollArea>

      <MaterialDrawerActions material={material} onArchived={onClose} />
    </>
  );
}

export function MaterialDrawer({ materialId, open, onClose }: MaterialDrawerProps): React.ReactElement {
  const { data: material, isLoading, isError } = useMaterial(materialId ?? '');

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col overflow-hidden [&>button:last-child]:hidden">
        <SheetTitle className="sr-only">Material Details</SheetTitle>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3.5 right-3.5 z-20 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <p className="text-sm text-muted-foreground">Unable to load this material. Please try again.</p>
          </div>
        ) : isLoading || !material ? (
          <DrawerSkeleton />
        ) : (
          <MaterialDrawerBody material={material} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}
