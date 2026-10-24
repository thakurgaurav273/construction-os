'use client';

import React from 'react';
import { toast } from 'sonner';
import { DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator } from '@sitepilot/ui';
import { formatRole } from '@/features/settings/constants';
import { useMyOrganizations, useSwitchOrganization } from '@/hooks/api/use-account';
import { getApiErrorMessage } from '@/lib/api/errors';

interface OrganizationMenuItemsProps {
  /** Adds a separator after the list, for menus that continue with other items. */
  separatorAfter?: boolean;
}

/**
 * The organizations the person belongs to, as menu items that switch between them. Renders nothing for
 * people in a single organization.
 */
export function OrganizationMenuItems({ separatorAfter = false }: OrganizationMenuItemsProps): React.ReactElement | null {
  const { data: memberships = [] } = useMyOrganizations();
  const switchOrganization = useSwitchOrganization();
  if (memberships.length < 2) return null;
  const current = memberships.find((membership) => membership.isCurrent)?.organizationId ?? '';

  function choose(organizationId: string): void {
    if (organizationId === current || switchOrganization.isPending) return;
    switchOrganization.mutate(organizationId, {
      onError: (error) => toast.error(getApiErrorMessage(error, "Couldn't switch organization. Try again.")),
    });
  }

  return (
    <>
      <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
        {switchOrganization.isPending ? 'Switching…' : 'Organizations'}
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup value={current} onValueChange={choose}>
        {memberships.map((membership) => (
          <DropdownMenuRadioItem
            key={membership.organizationId}
            value={membership.organizationId}
            disabled={switchOrganization.isPending}
            // Keep the menu open while switching so the "Switching…" state stays visible until the reload.
            onSelect={(event) => { if (membership.organizationId !== current) event.preventDefault(); }}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate">{membership.name}</span>
              <span className="block text-xs text-muted-foreground">{formatRole(membership.role)}</span>
            </span>
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
      {separatorAfter && <DropdownMenuSeparator />}
    </>
  );
}
