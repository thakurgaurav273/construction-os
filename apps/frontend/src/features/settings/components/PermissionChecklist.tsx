'use client';

import React, { useMemo } from 'react';
import type { Permission } from '@sitepilot/types';
import { Badge, cn } from '@sitepilot/ui';
import { Check, Minus } from 'lucide-react';
import type { RoleCatalogue } from '@/hooks/api/use-settings';

type CatalogueEntry = RoleCatalogue['permissions'][number];

interface PermissionChecklistProps {
  catalogue: CatalogueEntry[];
  /** What is ticked. */
  selected: ReadonlySet<Permission>;
  /** What it started from (role defaults, or the member's role); differences are labelled Added/Removed. */
  baseline: ReadonlySet<Permission>;
  /** Omit to show the list read-only. */
  onToggle?: (permission: Permission, checked: boolean) => void;
  /** Permissions that can't be ticked here, e.g. ones the editor doesn't hold themselves. */
  locked?: ReadonlySet<Permission>;
}

function groupByArea(catalogue: CatalogueEntry[]): { name: string; permissions: CatalogueEntry[] }[] {
  const groups = new Map<string, CatalogueEntry[]>();
  for (const entry of catalogue) groups.set(entry.group, [...(groups.get(entry.group) ?? []), entry]);
  return [...groups.entries()].map(([name, permissions]) => ({ name, permissions }));
}

/** Permissions grouped by area, as ticks to read or checkboxes to edit. */
export function PermissionChecklist({ catalogue, selected, baseline, onToggle, locked }: PermissionChecklistProps): React.ReactElement {
  const groups = useMemo(() => groupByArea(catalogue), [catalogue]);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {groups.map((group) => (
        <section key={group.name} aria-labelledby={`permission-group-${group.name}`}>
          <h4 id={`permission-group-${group.name}`} className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.name}</h4>
          <ul className="space-y-1.5">
            {group.permissions.map((permission) => {
              const allowed = selected.has(permission.key);
              const changed = allowed !== baseline.has(permission.key);
              const change = changed && <Badge variant="outline" className="ml-1.5 px-1.5 py-0 text-[10px]">{allowed ? 'Added' : 'Removed'}</Badge>;
              if (!onToggle) {
                return (
                  <li key={permission.key} className={cn('flex items-start gap-2 text-sm', !allowed && 'text-muted-foreground')}>
                    {allowed
                      ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-label="Allowed" />
                      : <Minus className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" aria-label="Not allowed" />}
                    <span>{permission.label}{change}</span>
                  </li>
                );
              }
              const disabled = locked?.has(permission.key) ?? false;
              return (
                <li key={permission.key}>
                  <label className={cn('flex items-start gap-2 text-sm', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', !allowed && 'text-muted-foreground')}>
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-input accent-primary"
                      checked={allowed}
                      disabled={disabled}
                      onChange={(event) => onToggle(permission.key, event.target.checked)}
                    />
                    <span>{permission.label}{change}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
