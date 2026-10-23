'use client';

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@sitepilot/ui';
import { AccessRequestsPanel } from '@/features/platform/components/AccessRequestsPanel';
import { TenantsPanel } from '@/features/platform/components/TenantsPanel';
import { PlatformKeysPanel } from '@/features/platform/components/PlatformKeysPanel';
import { PlatformUsagePanel } from '@/features/platform/components/PlatformUsagePanel';
import { usePlatformRequests } from '@/hooks/api/use-platform';

export default function PlatformConsolePage(): React.ReactElement {
  const { data: pending = [] } = usePlatformRequests('PENDING');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform console</h1>
        <p className="mt-1 text-muted-foreground">Approve AI trials, manage the platform&apos;s AI keys and see every tenant.</p>
      </div>
      <Tabs defaultValue="requests">
        <TabsList className="mb-4 h-auto flex-wrap">
          <TabsTrigger value="requests">AI requests{pending.length > 0 ? ` (${pending.length})` : ''}</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="keys">Platform AI keys</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
        </TabsList>
        <TabsContent value="requests"><AccessRequestsPanel /></TabsContent>
        <TabsContent value="tenants"><TenantsPanel /></TabsContent>
        <TabsContent value="keys"><PlatformKeysPanel /></TabsContent>
        <TabsContent value="usage"><PlatformUsagePanel /></TabsContent>
      </Tabs>
    </div>
  );
}
