'use client';

import { Search, Menu } from 'lucide-react';
import { Button, Skeleton } from '@sitepilot/ui';
import { usePathname } from 'next/navigation';
import { useAuthHydrated, useAuthStore } from '@/store/auth.store';

import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { HelpButton } from '@/features/help/components/HelpButton';

export function Header({ onMenuClick, onSearchClick }: { onMenuClick: () => void, onSearchClick: () => void }) {
  const pathname = usePathname();
  const organizationName = useAuthStore((state) => state.organization?.name);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthHydrated();
  
  const segments = pathname.split('/').filter(Boolean);
  const currentPath = segments.length > 0 
    ? segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1)
    : 'Dashboard';

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      <button 
        type="button" 
        className="-m-2.5 p-2.5 text-muted-foreground md:hidden"
        onClick={onMenuClick}
        data-tour="header-menu"
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="h-6 w-px bg-border md:hidden" aria-hidden="true" />

      <div className="flex flex-1 items-center justify-between gap-x-4 self-stretch lg:gap-x-6">
        
        <div className="flex items-center text-sm font-medium text-muted-foreground hidden sm:flex">
          {hydrated ? <span>{organizationName ?? 'SitePilot'}</span> : <Skeleton className="h-4 w-24" />}
          <span className="mx-2 text-border">/</span>
          <span className="text-foreground">{currentPath}</span>
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
          <button
            onClick={onSearchClick}
            className="group flex max-w-md flex-1 items-center gap-2 rounded-full border border-border/50 bg-background shadow-sm hover:shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/30 transition-all duration-200 w-36 sm:w-64 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            aria-label="Search"
            data-tour="header-search"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted/30 px-1.5 font-mono text-[10px] font-medium opacity-100 group-hover:bg-muted/50">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          <div className="flex items-center gap-x-2">
            <HelpButton />
            <div data-tour="header-notifications" className="flex"><NotificationBell /></div>
            {/* The sidebar (with the account menu) is hidden on small screens. */}
            <div className="md:hidden">
              <UserMenu align="end" side="bottom">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Account menu">
                  <UserAvatar name={user?.name ?? ''} avatar={user?.avatar} className="h-7 w-7" fallbackClassName="text-[10px]" />
                </Button>
              </UserMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
