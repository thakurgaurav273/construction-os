'use client';

import { Bell, Search, Menu, CheckCircle2, AlertTriangle, FileText, Check, UserCircle } from 'lucide-react';
import { Button } from '@sitepilot/ui';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@sitepilot/ui';
import { ScrollArea } from '@sitepilot/ui';
import { Badge } from '@sitepilot/ui';
import { useNotifications, useMarkNotificationsRead } from '@/hooks/api/use-notifications';
import { useTheme } from 'next-themes';
import { UserMenu } from '@/features/auth/components/UserMenu';

export function Header({ onMenuClick, onSearchClick }: { onMenuClick: () => void, onSearchClick: () => void }) {
  const pathname = usePathname();
  const organizationName = useAuthStore((state) => state.organization?.name);
  const { theme, setTheme } = useTheme();
  
  // Decoupled from direct demo store, now using API hooks layer
  const { data: notifications = [] } = useNotifications();
  const markNotificationsReadMutation = useMarkNotificationsRead();
  const unreadCount = notifications.filter((n: any) => !(n.read || n.isRead)).length;

  const handleNotificationsOpen = (open: boolean) => {
    if (open && unreadCount > 0) {
      markNotificationsReadMutation.mutate();
    }
  };
  
  const segments = pathname.split('/').filter(Boolean);
  const currentPath = segments.length > 0 
    ? segments[segments.length - 1].charAt(0).toUpperCase() + segments[segments.length - 1].slice(1)
    : 'Dashboard';

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'alert': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'system': return <FileText className="h-4 w-4 text-blue-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-x-4 border-b bg-background/80 backdrop-blur-md px-4 sm:gap-x-6 sm:px-6 lg:px-8">
      <button 
        type="button" 
        className="-m-2.5 p-2.5 text-muted-foreground md:hidden"
        onClick={onMenuClick}
      >
        <span className="sr-only">Open sidebar</span>
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      <div className="h-6 w-px bg-border md:hidden" aria-hidden="true" />

      <div className="flex flex-1 items-center justify-between gap-x-4 self-stretch lg:gap-x-6">
        
        <div className="flex items-center text-sm font-medium text-muted-foreground hidden sm:flex">
          <span>{organizationName ?? 'SitePilot'}</span>
          <span className="mx-2 text-border">/</span>
          <span className="text-foreground">{currentPath}</span>
        </div>

        <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
          <button
            onClick={onSearchClick}
            className="group flex max-w-md flex-1 items-center gap-2 rounded-full border border-border/50 bg-background shadow-sm hover:shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/30 transition-all duration-200 w-48 sm:w-64 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left">Search...</span>
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded border bg-muted/30 px-1.5 font-mono text-[10px] font-medium opacity-100 group-hover:bg-muted/50">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>

          <div className="flex items-center gap-x-2">
            <DropdownMenu onOpenChange={handleNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:text-foreground" aria-label={`Notifications, ${unreadCount} unread`}>
                  <span className="sr-only">View notifications</span>
                  <Bell className="h-5 w-5" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-destructive border-2 border-background animate-in fade-in zoom-in" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 sm:w-96 p-0" alignOffset={-10}>
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <DropdownMenuLabel className="p-0 font-semibold text-sm">Notifications</DropdownMenuLabel>
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
                  )}
                </div>
                <ScrollArea className="h-[400px]">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Bell className="h-8 w-8 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-medium">You&apos;re all caught up!</p>
                      <p className="text-xs">No new notifications</p>
                    </div>
                  ) : (
                    <div className="flex flex-col py-1">
                      {notifications.map((n: any) => (
                        <DropdownMenuItem key={n.id} className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 rounded-none focus:bg-muted/50 ${!n.read ? 'bg-muted/30' : ''}`}>
                          <div className={`mt-0.5 rounded-full p-1.5 bg-background border ${!n.read ? 'border-primary/20 shadow-sm' : 'border-border/50'}`}>
                            {getNotificationIcon(n.type)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className={`text-sm leading-none ${!n.read ? 'font-semibold' : 'font-medium text-foreground/80'}`}>{n.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground font-medium pt-1 flex items-center gap-1">
                              {n.time} {!n.read && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />}
                            </p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <div className="p-2 border-t text-center">
                  <Button variant="ghost" className="w-full text-xs text-primary hover:text-primary/80" size="sm">
                    <Check className="mr-2 h-3.5 w-3.5" /> Mark all as read
                  </Button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* The sidebar (with the account menu) is hidden on small screens. */}
            <div className="md:hidden">
              <UserMenu align="end" side="bottom">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" aria-label="Account menu">
                  <UserCircle className="h-5 w-5" />
                </Button>
              </UserMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
