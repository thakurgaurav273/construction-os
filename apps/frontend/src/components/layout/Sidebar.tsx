'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Briefcase,
  FileText,
  Sparkles,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  DollarSign,
  Receipt,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import { Skeleton, cn } from '@sitepilot/ui';
import type { Permission } from '@sitepilot/types';
import { useAuthHydrated, useAuthStore } from '@/store/auth.store';
import { UserMenu } from '@/features/auth/components/UserMenu';
import { OrganizationSwitcher } from '@/features/auth/components/OrganizationSwitcher';
import { useOrganizationSettings } from '@/hooks/api/use-settings';
import { useCan, useCurrentAccess } from '@/hooks/api/use-access';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Hidden for members whose role doesn't grant it. */
  permission?: Permission;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Projects',
    items: [
      { name: 'Projects',      href: '/dashboard/projects',      icon: Briefcase },
      { name: 'Daily Reports', href: '/dashboard/daily-reports', icon: FileText },
      { name: 'AI Assistant',  href: '/dashboard/ai-assistant',  icon: Sparkles, permission: 'ai.use' },
      { name: 'AI Insights',   href: '/dashboard/ai',            icon: Lightbulb, permission: 'ai.use' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { name: 'Procurement', href: '/dashboard/procurement', icon: ShoppingCart },
      { name: 'Materials',   href: '/dashboard/materials',   icon: Package },
      { name: 'Inventory',   href: '/dashboard/inventory',   icon: Warehouse },
      { name: 'Workforce',   href: '/dashboard/workforce',   icon: Users },
    ],
  },
  {
    group: 'Business',
    items: [
      { name: 'Finance', href: '/dashboard/finance',  icon: DollarSign, permission: 'finance.view' },
      { name: 'Billing', href: '/dashboard/billing',  icon: Receipt, permission: 'billing.view' },
      { name: 'Reports', href: '/dashboard/reports',  icon: BarChart3 },
    ],
  },
  {
    group: 'Administration',
    items: [
      { name: 'Settings', href: '/dashboard/settings', icon: Settings },
    ],
  },
];

function isItemActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  // Whole path segments only, so /dashboard/ai doesn't light up on /dashboard/ai-assistant.
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const user = useAuthStore((state) => state.user);
  const organization = useAuthStore((state) => state.organization);
  const hydrated = useAuthHydrated();
  const { data: organizationSettings, isLoading: settingsLoading } = useOrganizationSettings();
  const { data: access } = useCurrentAccess();
  const can = useCan();
  // Until access is known, permission-gated items hold their place as skeletons instead of popping in.
  const visibleNavigation = navigation
    .map((group) => ({ ...group, items: group.items.filter((item) => !item.permission || !access || can(item.permission)) }))
    .filter((group) => group.items.length > 0);

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const orgInitials = organization?.name
    ? organization.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SP';

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="relative flex flex-col border-r bg-sidebar h-screen z-20 hidden md:flex shrink-0"
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-4 border-b border-sidebar-border shrink-0">
        <OrganizationSwitcher showIndicator={!isCollapsed}>
          <div className="flex items-center gap-3 overflow-hidden">
            {!hydrated || settingsLoading ? (
              <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
            ) : organizationSettings?.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URL, not a static asset
              <img src={organizationSettings.logoUrl} alt="" className="h-8 w-8 shrink-0 rounded-md border bg-background object-contain" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs shrink-0">
                {orgInitials}
              </div>
            )}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  {hydrated ? (
                    <span className="block font-semibold text-sm text-sidebar-foreground whitespace-nowrap truncate leading-tight">
                      {organizationSettings?.name ?? organization?.name ?? 'SitePilot'}
                    </span>
                  ) : (
                    <Skeleton className="mb-1 h-3.5 w-28" />
                  )}
                  <span className="block text-[10px] text-muted-foreground whitespace-nowrap leading-tight">
                    Construction ERP
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </OrganizationSwitcher>
      </div>

      {/* Collapse toggle: straddles the sidebar's edge on the line under the logo, so the container must not clip. */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-16 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm hover:bg-accent hover:text-foreground text-muted-foreground z-30 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-5" data-tour="sidebar-nav">
        {visibleNavigation.map((group) => (
          <div key={group.group}>
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="px-4 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap"
                >
                  {group.group}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="space-y-0.5 px-2">
              {group.items.map((item) => {
                if (item.permission && !access) {
                  return (
                    <div key={item.href} className={cn('flex h-9 items-center gap-3 px-2.5', isCollapsed && 'justify-center px-0')} aria-hidden="true">
                      <Skeleton className="h-4 w-4 shrink-0 rounded" />
                      {!isCollapsed && <Skeleton className="h-3.5 w-24" />}
                    </div>
                  );
                }
                const active = isItemActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
                      isCollapsed && 'justify-center px-0',
                    )}
                    title={isCollapsed ? item.name : undefined}
                    data-tour={`nav-${item.href.split('/').pop()}`}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active-indicator"
                        className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-r-full"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <item.icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        active ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground',
                      )}
                    />
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                          className="whitespace-nowrap overflow-hidden"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-sidebar-border shrink-0">
        <UserMenu side={isCollapsed ? 'right' : 'top'}>
          <button
            type="button"
            aria-label="Account menu"
            className={cn(
              'flex w-full items-center gap-3 overflow-hidden rounded-md p-1 text-left transition-colors hover:bg-sidebar-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isCollapsed && 'justify-center',
            )}
          >
            {hydrated ? (
              <div className="h-8 w-8 rounded-full bg-primary/10 border flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                {userInitials}
              </div>
            ) : (
              <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            )}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col overflow-hidden"
                >
                  {hydrated ? (
                    <>
                      <span className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
                        {user?.name ?? 'User'}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {user?.email ?? ''}
                      </span>
                    </>
                  ) : (
                    <div className="space-y-1.5 py-0.5">
                      <Skeleton className="h-3.5 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </UserMenu>
      </div>
    </motion.div>
  );
}
