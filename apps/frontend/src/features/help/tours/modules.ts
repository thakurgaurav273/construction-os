import type { TourKey } from '@sitepilot/types';
import type { TourDefinition } from '../types';

type ModuleTourKey = Exclude<TourKey, 'welcome'>;

/** Each tour plays the first time a member opens its page. */
export const MODULE_TOUR_ROUTES: Record<ModuleTourKey, string> = {
  projects: '/dashboard/projects',
  'daily-reports': '/dashboard/daily-reports',
  procurement: '/dashboard/procurement',
  materials: '/dashboard/materials',
  inventory: '/dashboard/inventory',
  workforce: '/dashboard/workforce',
  finance: '/dashboard/finance',
  billing: '/dashboard/billing',
  reports: '/dashboard/reports',
};

export const MODULE_TOURS: Record<ModuleTourKey, TourDefinition> = {
  projects: {
    key: 'projects',
    title: 'Projects',
    steps: [
      { target: 'projects-new', permission: 'project.create', title: 'New project', body: 'Add a project with its client, dates and budget.' },
      { target: 'projects-filters', title: 'Find projects fast', body: 'Search by name, client or location, and filter by status or priority. Archived projects stay hidden unless you ask for them.' },
      { title: 'Inside a project', body: 'Open a project for its budget, team, daily reports, materials, purchase orders and timeline.' },
    ],
  },
  'daily-reports': {
    key: 'daily-reports',
    title: 'Daily Reports',
    steps: [
      { target: 'daily-reports-new', permission: 'dailyReport.write', title: 'New report', body: 'Pick the project, then record the day’s work, labour, materials, equipment and issues.' },
      { target: 'daily-reports-filters', title: 'Every report in one place', body: 'Search and filter reports across all your projects by status or project.' },
      { permission: 'dailyReport.approve', title: 'Reviewing', body: 'Submitted reports wait for your approval. Approve them, or send them back with a note.' },
    ],
  },
  procurement: {
    key: 'procurement',
    title: 'Procurement',
    steps: [
      { target: 'procurement-new-order', permission: 'po.create', title: 'Purchase orders', body: 'Raise an order for a project. Someone other than you approves it.' },
      { target: 'procurement-tabs', title: 'The buying cycle', body: 'Compare quotes in RFQs, award one to create the order, then receive deliveries against it into a store.' },
    ],
  },
  materials: {
    key: 'materials',
    title: 'Materials',
    steps: [
      { target: 'materials-new', permission: 'material.manage', title: 'Your catalogue', body: 'Add each material once with its unit, category and reorder level.' },
      { target: 'materials-tabs', title: 'Stock you can trust', body: 'Stock comes only from receipts, issues, returns and counts, so these numbers always add up.' },
      { title: 'Issuing to site', body: 'Issue material from a project’s Materials tab. Each issue gets a numbered note.' },
    ],
  },
  inventory: {
    key: 'inventory',
    title: 'Inventory',
    steps: [
      { target: 'inventory-tabs', title: 'Stores and stock', body: 'See stock per store, set up warehouses and bins, and move stock with transfers.' },
      { title: 'Two people per transfer', body: 'Someone requests a transfer, someone else approves it, and the receiving store marks it received.' },
    ],
  },
  workforce: {
    key: 'workforce',
    title: 'Workforce',
    steps: [
      { target: 'workforce-attendance', permission: 'attendance.mark', title: 'Mark attendance', body: 'Mark a whole crew present, absent, late or half-day for a project and date.' },
      { target: 'workforce-new', permission: 'workforce.manage', title: 'Add workers', body: 'Add people to your directory, then assign them to projects.' },
      { target: 'workforce-tabs', title: 'Your crew at a glance', body: 'Directory, attendance history, trades and compliance.' },
    ],
  },
  finance: {
    key: 'finance',
    title: 'Finance',
    permission: 'finance.view',
    steps: [
      { target: 'finance-new', permission: 'invoice.create', title: 'Vendor bills', body: 'Record a supplier’s invoice and match it to its purchase order.' },
      { target: 'finance-tabs', title: 'Money in one place', body: 'Bills, payment requests, budgets and cash flow. Every approval needs a second person.' },
    ],
  },
  billing: {
    key: 'billing',
    title: 'Billing',
    permission: 'billing.view',
    steps: [
      { target: 'billing-tabs', title: 'Billing at a glance', body: 'RA bills, what clients owe you, margin, contracts and clients.' },
      { target: 'billing-new-contract', permission: 'contract.manage', title: 'Start with a contract', body: 'Create a client contract or a subcontract, then add its BOQ.' },
      { title: 'From BOQ to payment', body: 'Raise an RA bill, record the measurement book, submit and certify. Certified bills flow to Finance for payment or receipt.' },
    ],
  },
  reports: {
    key: 'reports',
    title: 'Reports',
    steps: [
      { target: 'reports-tabs', title: 'Reports', body: 'Generate a branded PDF or Excel report from a template, find past reports in History, and email them on a schedule.' },
    ],
  },
};
