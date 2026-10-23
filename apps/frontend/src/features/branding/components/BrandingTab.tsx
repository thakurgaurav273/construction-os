'use client';

import React from 'react';
import { Button, Skeleton } from '@sitepilot/ui';
import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan } from '@/hooks/api/use-access';
import { useOrganizationSettings } from '@/hooks/api/use-settings';
import { LogoCard } from './LogoCard';
import { BrandColorCard } from './BrandColorCard';
import { AppearanceCard } from './AppearanceCard';

/** Settings → Branding: the organization's logo and colour (admins), and each member's light/dark choice. */
export function BrandingTab(): React.ReactElement {
  const canManage = useCan()('organization.manage');
  const { data: organization, isLoading, isError, refetch } = useOrganizationSettings();

  if (isLoading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-40 w-full rounded-xl" />)}</div>;
  if (isError || !organization) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Unable to load branding"
        description="Check your connection and try again."
        action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      {!canManage && (
        <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          Your organization&apos;s logo and colour are set by its admins. You can still choose light or dark mode for yourself below.
        </p>
      )}
      <LogoCard organization={organization} canManage={canManage} />
      <BrandColorCard organization={organization} canManage={canManage} />
      <AppearanceCard />
    </div>
  );
}
