'use client';

import React from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@sitepilot/ui';
import { useBudgetCategories } from '@/hooks/api/use-finance';

interface CategorySelectProps {
  projectId: string | undefined;
  value: string;
  onChange: (category: string) => void;
  /** Usual categories offered after the project's budget heads. */
  fallbackCategories: string[];
}

/**
 * Orders and bills count against the budget head with the same name, so the project's heads come first.
 * A category outside every head still works; its spend shows as Unbudgeted.
 */
export function CategorySelect({ projectId, value, onChange, fallbackCategories }: CategorySelectProps): React.ReactElement {
  const { data: heads = [] } = useBudgetCategories(projectId);
  const headKeys = new Set(heads.map((head) => head.toLowerCase()));
  const others = [...new Set([value, ...fallbackCategories].filter((category) => !!category && !headKeys.has(category.toLowerCase())))];
  const selected = heads.find((head) => head.toLowerCase() === value.toLowerCase()) ?? value;

  return (
    <Select value={selected} onValueChange={onChange}>
      <SelectTrigger aria-label="Category"><SelectValue placeholder="Select a category" /></SelectTrigger>
      <SelectContent>
        {heads.length > 0 && (
          <SelectGroup>
            <SelectLabel>Budget heads</SelectLabel>
            {heads.map((head) => <SelectItem key={head} value={head}>{head}</SelectItem>)}
          </SelectGroup>
        )}
        {heads.length > 0 && others.length > 0 && <SelectSeparator />}
        {others.length > 0 && (
          <SelectGroup>
            {heads.length > 0 && <SelectLabel>Outside the budget</SelectLabel>}
            {others.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
