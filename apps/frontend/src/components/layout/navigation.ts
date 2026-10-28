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
  Lightbulb,
  type LucideIcon,
} from 'lucide-react';
import type { Permission } from '@sitepilot/types';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  /** Hidden for members whose role doesn't grant it. */
  permission?: Permission;
}

export interface NavGroup {
  group: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
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

export function isItemActive(href: string, pathname: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  // Whole path segments only, so /dashboard/ai doesn't light up on /dashboard/ai-assistant.
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The header title for a page: its sidebar section ("Projects" on /dashboard/projects/<id>/timeline), so
 * record IDs and URL slugs never show. Pages outside the sidebar get their first segment in words.
 */
export function sectionTitle(pathname: string): string {
  for (const group of navigation) {
    const item = group.items.find((candidate) => isItemActive(candidate.href, pathname));
    if (item) return item.name;
  }
  const section = pathname.split('/').filter(Boolean)[1];
  if (!section) return 'Dashboard';
  return section.split('-').map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}
