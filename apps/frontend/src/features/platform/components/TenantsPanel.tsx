'use client';

import React from 'react';
import { format } from 'date-fns';
import { Badge, Button, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, Building2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { MobileCard, MobileCardList, useIncrementalItems } from '@/components/shared/MobileList';
import { usePlatformTenants, type PlatformTenant } from '@/hooks/api/use-platform';

const MODE_LABEL: Record<PlatformTenant['aiMode'], { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  OWN_KEY: { label: 'Own key', variant: 'default' },
  PLATFORM: { label: 'Platform trial', variant: 'secondary' },
  NONE: { label: 'AI off', variant: 'outline' },
};

function describeAllowance({ allowance }: PlatformTenant): string {
  if (!allowance.active) return '—';
  const until = allowance.expiresAt ? `, until ${format(new Date(allowance.expiresAt), 'dd MMM')}` : '';
  return `${allowance.remaining}/${allowance.granted} left${until}`;
}

/** Every organization on the platform with its AI situation. */
export function TenantsPanel(): React.ReactElement {
  const { data: tenants = [], isLoading, isError, refetch } = usePlatformTenants();
  const phoneTenants = useIncrementalItems(tenants, 'tenants');
  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (isError) return <EmptyState icon={AlertTriangle} title="Unable to load tenants" description="Check your connection and try again." action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>} />;
  if (tenants.length === 0) return <EmptyState icon={Building2} title="No tenants yet" description="Organizations appear here as they sign up." />;

  return (
    <>
      <MobileCardList
        items={phoneTenants.visible}
        getKey={(tenant) => tenant.id}
        hasMore={phoneTenants.hasMore}
        onLoadMore={phoneTenants.loadMore}
        renderCard={(tenant) => {
          const mode = MODE_LABEL[tenant.aiMode];
          return (
            <MobileCard
              title={tenant.name}
              subtitle={`${tenant.slug} · Joined ${format(new Date(tenant.createdAt), 'dd MMM yyyy')}`}
              aside={<Badge variant={mode.variant}>{mode.label}</Badge>}
              meta={[
                { label: 'Members', value: tenant.memberCount },
                { label: 'Projects', value: tenant.projectCount },
                { label: 'AI calls (30 d)', value: tenant.aiCallsLast30Days },
                { label: 'Allowance', value: describeAllowance(tenant) },
              ]}
            />
          );
        }}
      />
      <div className="hidden overflow-x-auto rounded-xl border bg-card md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">Organization</th>
              <th className="px-4 py-2.5 font-medium">Members</th>
              <th className="px-4 py-2.5 font-medium">Projects</th>
              <th className="px-4 py-2.5 font-medium">AI</th>
              <th className="px-4 py-2.5 font-medium">Allowance</th>
              <th className="px-4 py-2.5 font-medium">AI calls (30 d)</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tenants.map((tenant) => {
              const mode = MODE_LABEL[tenant.aiMode];
              return (
                <tr key={tenant.id}>
                  <td className="px-4 py-3"><p className="font-medium">{tenant.name}</p><p className="text-xs text-muted-foreground">{tenant.slug}</p></td>
                  <td className="px-4 py-3">{tenant.memberCount}</td>
                  <td className="px-4 py-3">{tenant.projectCount}</td>
                  <td className="px-4 py-3"><Badge variant={mode.variant}>{mode.label}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground">{describeAllowance(tenant)}</td>
                  <td className="px-4 py-3">{tenant.aiCallsLast30Days}</td>
                  <td className="px-4 py-3 text-muted-foreground">{format(new Date(tenant.createdAt), 'dd MMM yyyy')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
