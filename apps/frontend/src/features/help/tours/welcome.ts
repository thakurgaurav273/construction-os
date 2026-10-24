import type { Permission } from '@sitepilot/types';
import type { TourDefinition, TourStep } from '../types';

/** The module a member works in most, judged by what their role can do (never by role name). */
const MAIN_MODULES: { permission: Permission; step: TourStep }[] = [
  {
    permission: 'project.create',
    step: { target: 'nav-projects', title: 'Start with Projects', body: 'Everything is filed against a project: reports, orders, materials and bills. Create one first.' },
  },
  {
    permission: 'invoice.create',
    step: { target: 'nav-finance', title: 'Your home: Finance', body: 'Vendor bills, payment approvals and budgets live here.' },
  },
  {
    permission: 'dailyReport.write',
    step: { target: 'nav-daily-reports', title: 'Your home: Daily Reports', body: 'Record each day’s work, labour and issues from site. Your reports go to the project manager for approval.' },
  },
  {
    permission: 'po.create',
    step: { target: 'nav-procurement', title: 'Your home: Procurement', body: 'Vendors, RFQs, purchase orders and deliveries live here.' },
  },
];

export function welcomeTour(can: (permission: Permission) => boolean): TourDefinition {
  const mainModule = MAIN_MODULES.find((candidate) => can(candidate.permission))?.step;
  return {
    key: 'welcome',
    title: 'Welcome to SitePilot',
    steps: [
      {
        title: 'Welcome to SitePilot',
        body: 'A quick look around: it takes under a minute. You can leave at any time with Escape and replay it from Help.',
      },
      { target: 'sidebar-nav', title: 'Modules', body: 'Move between modules here. You only see the ones your role can use.' },
      { target: 'header-menu', title: 'Modules', body: 'Open the menu to move between modules. You only see the ones your role can use.' },
      { target: 'header-search', title: 'Search anything', body: 'Press ⌘K (Ctrl K on Windows) to jump to a page or search the guides.' },
      { target: 'header-notifications', title: 'Notifications', body: 'Approvals waiting for you and updates on your requests arrive here as they happen.' },
      { target: 'header-help', title: 'Help is always here', body: 'Open guides for the page you’re on, search every guide, or replay a tour.' },
      {
        target: 'dashboard-new-project',
        permission: 'project.create',
        title: 'Create a project',
        body: 'Start here when you take on new work: name, client, dates and budget.',
      },
      ...(mainModule ? [mainModule] : []),
      {
        target: 'dashboard-checklist',
        title: 'Getting started',
        body: 'This checklist ticks itself off as your team uses SitePilot. Dismiss it whenever you like.',
      },
      { title: 'You’re all set', body: 'Each module has its own short tour the first time you open it.' },
    ],
  };
}
