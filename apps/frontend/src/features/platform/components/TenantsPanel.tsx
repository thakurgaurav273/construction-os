'use client';

import React from 'react';
import { format } from 'date-fns';
import { Badge, Button, Skeleton } from '@sitepilot/ui';
import { AlertTriangle, Building2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { usePlatformTenants, type PlatformTenant } from '@/hooks/api/use-platform';

const MODE_LABEL: Record<PlatformTenant['aiMode'], { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  OWN_KEY: { label: 'Own key', variant: 'default' },
  PLATFORM: { label: 'Platform trial', variant: 'secondary' },
  NONE: { label: 'AI off', variant: 'outline' },
};

/** Every organization on the platform with its AI situation. */
export function TenantsPanel(): React.ReactElement {
  const { data: tenants = [], isLoading, isError, refetch } = usePlatformTenants();
  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (isError) return <EmptyState icon={AlertTriangle} title="Unable to load tenants" description="Check your connection and try again." action={<Button variant="outline" onClick={() => refetch()}>Retry</Button>} />;
  if (tenants.length === 0) return <EmptyState icon={Building2} title="No tenants yet" description="Organizations appear here as they sign up." />;

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
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
                <td className="px-4 py-3 text-muted-foreground">
                  {tenant.allowance.active
                    ? `${tenant.allowance.remaining}/${tenant.allowance.granted} left${tenant.allowance.expiresAt ? `, until ${format(new Date(tenant.allowance.expiresAt), 'dd MMM')}` : ''}`
                    : '—'}
                </td>
                <td className="px-4 py-3">{tenant.aiCallsLast30Days}</td>
                <td className="px-4 py-3 text-muted-foreground">{format(new Date(tenant.createdAt), 'dd MMM yyyy')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
