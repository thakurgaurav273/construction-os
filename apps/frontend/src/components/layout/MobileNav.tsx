'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle, cn } from '@sitepilot/ui';
import { useCan, useCurrentAccess } from '@/hooks/api/use-access';
import { isItemActive, navigation, type NavItem } from './navigation';
import { Sidebar } from './Sidebar';

/** Bottom-bar tabs besides Dashboard, in order of preference; members get the first three they can open. */
const BOTTOM_BAR_PREFERENCE = [
  '/dashboard/projects', '/dashboard/daily-reports', '/dashboard/workforce', '/dashboard/procurement',
  '/dashboard/materials', '/dashboard/inventory', '/dashboard/finance', '/dashboard/billing',
];
const BOTTOM_BAR_EXTRA_TABS = 3;
/** Labels that fit under an icon on a phone. */
const SHORT_LABELS: Record<string, string> = { '/dashboard': 'Home', '/dashboard/daily-reports': 'Daily' };

const ALL_ITEMS = navigation.flatMap((group) => group.items);

/** The full menu, sliding in from the left on phones and small tablets. */
export function MobileNavDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }): React.ReactElement {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[85vw] max-w-[300px] p-0 md:hidden [&>button]:hidden">
        <SheetTitle className="sr-only">Menu</SheetTitle>
        <SheetDescription className="sr-only">Go to another part of SitePilot.</SheetDescription>
        <Sidebar inDrawer onNavigate={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

/** App-style tab bar on phones: the areas this member uses most, plus More for the full menu. */
export function MobileBottomNav({ onMore }: { onMore: () => void }): React.ReactElement {
  const pathname = usePathname();
  const can = useCan();
  const accessLoaded = useCurrentAccess().data !== undefined;
  const allowed = (item: NavItem): boolean => !item.permission || (accessLoaded && can(item.permission));
  const dashboard = ALL_ITEMS.find((item) => item.href === '/dashboard');
  const preferred = BOTTOM_BAR_PREFERENCE
    .map((href) => ALL_ITEMS.find((item) => item.href === href))
    .filter((item): item is NavItem => item !== undefined && allowed(item))
    .slice(0, BOTTOM_BAR_EXTRA_TABS);
  const tabs = dashboard ? [dashboard, ...preferred] : preferred;
  const moreActive = !tabs.some((item) => isItemActive(item.href, pathname));

  const tabClass = (active: boolean): string => cn(
    'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[11px] font-medium transition-colors',
    active ? 'text-primary' : 'text-muted-foreground',
  );

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden print:hidden"
    >
      {tabs.map((item) => {
        const active = isItemActive(item.href, pathname);
        return (
          <Link key={item.href} href={item.href} className={tabClass(active)} aria-current={active ? 'page' : undefined}>
            <item.icon className="h-5 w-5" />
            <span className="max-w-full truncate px-1">{SHORT_LABELS[item.href] ?? item.name}</span>
          </Link>
        );
      })}
      <button type="button" onClick={onMore} className={tabClass(moreActive)}>
        <Menu className="h-5 w-5" />
        <span>More</span>
      </button>
    </nav>
  );
}
