'use client';

import React from 'react';
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@sitepilot/ui';
import { Search } from 'lucide-react';
import { useProjects } from '@/hooks/api/use-projects';
import { DIRECTION_LABELS } from '../constants';
import type { ContractDirection } from '../types';

export const ALL = 'all';

export interface BillingFilterValues {
  search: string;
  direction: ContractDirection | typeof ALL;
  projectId: string;
}

export const DEFAULT_BILLING_FILTERS: BillingFilterValues = { search: '', direction: ALL, projectId: ALL };

interface BillingFiltersProps {
  value: BillingFilterValues;
  onChange: (value: BillingFilterValues) => void;
  searchPlaceholder: string;
  /** Extra filter, e.g. bill status. */
  children?: React.ReactNode;
}

export function BillingFilters({ value, onChange, searchPlaceholder, children }: BillingFiltersProps): React.ReactElement {
  const { data: projects = [] } = useProjects();
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1 sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search"
          placeholder={searchPlaceholder}
          className="pl-9"
          value={value.search}
          onChange={(event) => onChange({ ...value, search: event.target.value })}
        />
      </div>
      <Select value={value.direction} onValueChange={(direction) => onChange({ ...value, direction: direction as BillingFilterValues['direction'] })}>
        <SelectTrigger className="sm:w-48" aria-label="Direction"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Both directions</SelectItem>
          <SelectItem value="CLIENT">{DIRECTION_LABELS.CLIENT.label}s</SelectItem>
          <SelectItem value="SUBCONTRACT">{DIRECTION_LABELS.SUBCONTRACT.label}s</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.projectId} onValueChange={(projectId) => onChange({ ...value, projectId })}>
        <SelectTrigger className="sm:w-56" aria-label="Project"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All projects</SelectItem>
          {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {children}
    </div>
  );
}

/** Server filters for the list hooks; "all" means no filter. */
export function toServerFilters(value: BillingFilterValues): { direction?: ContractDirection; projectId?: string } {
  return {
    direction: value.direction === ALL ? undefined : value.direction,
    projectId: value.projectId === ALL ? undefined : value.projectId,
  };
}

export function matchesSearch(search: string, ...fields: (string | null | undefined)[]): boolean {
  const query = search.trim().toLowerCase();
  return !query || fields.some((field) => field?.toLowerCase().includes(query));
}
