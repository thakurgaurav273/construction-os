'use client';

import React from 'react';
import Link from 'next/link';
import { Button, Skeleton } from '@sitepilot/ui';
import { ArrowLeft, ShieldAlert, ShieldCheck } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCurrentAccess } from '@/hooks/api/use-access';

/** The operator console sits outside the tenant dashboard: it spans every organization. */
export default function PlatformLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  const { data: access, isLoading } = useCurrentAccess();
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="h-5 w-5 text-primary" /> SitePilot Platform</p>
          <Button variant="ghost" size="sm" asChild><Link href="/dashboard"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back to workspace</Link></Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        {isLoading ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : access?.isPlatformAdmin ? children : (
          <EmptyState
            icon={ShieldAlert}
            title="Platform administrators only"
            description="This console manages every SitePilot organization. Your account isn't on the platform admin list."
            action={<Button asChild><Link href="/dashboard">Back to workspace</Link></Button>}
          />
        )}
      </main>
    </div>
  );
}
