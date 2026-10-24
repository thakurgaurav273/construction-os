'use client';

import React from 'react';
import { ChevronsUpDown } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@sitepilot/ui';
import { useMyOrganizations } from '@/hooks/api/use-account';
import { OrganizationMenuItems } from './OrganizationMenuItems';

interface OrganizationSwitcherProps {
  /** The organization's logo and name, shown as they are for people in a single organization. */
  children: React.ReactNode;
  /** Hidden while the sidebar is collapsed to icons. */
  showIndicator: boolean;
}

/** Turns the sidebar's organization block into a switcher for people who belong to several organizations. */
export function OrganizationSwitcher({ children, showIndicator }: OrganizationSwitcherProps): React.ReactElement {
  const { data: memberships = [] } = useMyOrganizations();
  if (memberships.length < 2) return <>{children}</>;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch organization"
          className="-mx-1.5 flex min-w-0 flex-1 items-center gap-1 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {children}
          {showIndicator && <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <OrganizationMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
