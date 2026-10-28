'use client';

import { Search, Menu } from 'lucide-react';
import { Button, Skeleton } from '@sitepilot/ui';
import { usePathname } from 'next/navigation';
import { useAuthHydrated, useAuthStore } from '@/store/auth.store';

import { NotificationBell } from '@/features/notifications/components/NotificationBell';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { HelpButton } from '@/features/help/components/HelpButton';
import { sectionTitle } from './navigation';

export function Header({ onMenuClick, onSearchClick }: { onMenuClick: () => void, onSearchClick: () => void }) {
  const pathname = usePathname();
  const organizationName = useAuthStore((state) => state.organization?.name);
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthHydrated();
  
  const currentPath = sectionTitle(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-x-3 border-b bg-background/80 backdrop-blur-md px-3 pt-[env(safe-area-inset-top)] sm:h-16 sm:gap-x-6 sm:px-6 lg:px-8">
      <button 
        type="button" 
        className="-m-1 rounded-md p-2 text-muted-foreground hover:bg-muted md:hidden"
        aria-label="Open menu"
        onClick={onMenuClick}
        data-tour="header-menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-x-3 self-stretch lg:gap-x-6">
        {/* Phones: the page name, like an app bar. Wider screens: organization / page. */}
        <h1 className="truncate text-base font-semibold sm:hidden">{currentPath}</h1>
        <div className="hidden items-center text-sm font-medium text-muted-foreground sm:flex">
          {hydrated ? <span>{organizationName ?? 'SitePilot'}</span> : <Skeleton className="h-4 w-24" />}
          <span className="mx-2 text-border">/</span>
          <span className="text-foreground">{currentPath}</span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-x-1 sm:gap-x-4 lg:gap-x-6">
          <button
            onClick={onSearchClick}
            className="group flex items-center gap-2 rounded-full p-2 text-sm text-muted-foreground transition-all duration-200 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 sm:w-64 sm:max-w-md sm:flex-1 sm:border sm:border-border/50 sm:bg-background sm:px-3 sm:py-1.5 sm:shadow-sm sm:hover:shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]"
            aria-label="Search"
            data-tour="header-search"
          >
            <Search className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="hidden flex-1 text-left sm:inline">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted/30 px-1.5 font-mono text-[10px] font-medium opacity-100 group-hover:bg-muted/50">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          <div className="flex items-center gap-x-1 sm:gap-x-2">
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
