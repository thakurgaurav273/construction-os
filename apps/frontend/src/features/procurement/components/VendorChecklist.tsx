'use client';

import React from 'react';
import { Badge } from '@sitepilot/ui';
import { Star } from 'lucide-react';
import type { Vendor } from '../types';

interface VendorChecklistProps {
  vendors: Vendor[];
  value: string[];
  onChange: (vendorIds: string[]) => void;
  /** Vendors supplying this category are listed first. */
  category?: string;
  /** Already invited; shown but can't be toggled. */
  lockedIds?: string[];
}

export function VendorChecklist({ vendors, value, onChange, category, lockedIds = [] }: VendorChecklistProps): React.ReactElement {
  const ordered = [...vendors]
    .filter((vendor) => vendor.status === 'ACTIVE')
    .sort((a, b) => {
      const matchA = category && a.categories.includes(category) ? 1 : 0;
      const matchB = category && b.categories.includes(category) ? 1 : 0;
      return matchB - matchA || b.performanceScore - a.performanceScore;
    });

  if (ordered.length === 0) {
    return <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">Add an active vendor first.</p>;
  }

  function toggle(vendorId: string): void {
    onChange(value.includes(vendorId) ? value.filter((id) => id !== vendorId) : [...value, vendorId]);
  }

  return (
    <div className="max-h-56 overflow-y-auto rounded-lg border divide-y">
      {ordered.map((vendor) => {
        const locked = lockedIds.includes(vendor.id);
        const checked = locked || value.includes(vendor.id);
        return (
          <label
            key={vendor.id}
            className={`flex items-center gap-3 px-3 py-2 text-sm ${locked ? 'opacity-60' : 'cursor-pointer hover:bg-muted/50'}`}
          >
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-primary"
              checked={checked}
              disabled={locked}
              onChange={() => toggle(vendor.id)}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{vendor.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {vendor.categories.join(', ') || 'No categories'}{locked ? ' · already invited' : ''}
              </span>
            </span>
            {category && vendor.categories.includes(category) && <Badge variant="secondary" className="text-[10px]">Match</Badge>}
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {vendor.rating.toFixed(1)}
            </span>
          </label>
        );
      })}
    </div>
  );
}
