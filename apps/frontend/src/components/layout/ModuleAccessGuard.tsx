'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock } from 'lucide-react';
import { Button } from '@sitepilot/ui';
import { EmptyState } from '@/components/shared/EmptyState';
import { useCan, useCurrentAccess } from '@/hooks/api/use-access';
import { navItemFor } from './navigation';

/**
 * Stops a page from rendering for members without its module's view permission, e.g. a bookmarked
 * Procurement link. The API refuses the data either way; this explains why instead of showing errors.
 */
export function ModuleAccessGuard({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const { data: access } = useCurrentAccess();
  const can = useCan();
  const item = navItemFor(pathname);

  if (!item?.permission || !access || can(item.permission)) return <>{children}</>;
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={Lock}
        title={`You don’t have access to ${item.name}`}
        description="Your role or your own permissions don’t include this area. Ask an admin if you need it for your work."
        action={<Button variant="outline" asChild><Link href="/dashboard">Back to dashboard</Link></Button>}
      />
    </div>
  );
}
