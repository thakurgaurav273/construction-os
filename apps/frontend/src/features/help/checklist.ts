import type { ChecklistStepKey, Permission } from '@sitepilot/types';

export interface ChecklistStep {
  key: ChecklistStepKey;
  label: string;
  description: string;
  /** Only members who can do the step see it. */
  permission: Permission;
  href: string;
  guideId: string;
}

export const CHECKLIST_STEPS: ChecklistStep[] = [
  { key: 'invite-team', label: 'Invite your team', description: 'Bring in the people who run your sites and office.', permission: 'members.manage', href: '/dashboard/settings#members', guideId: 'settings.invite' },
  { key: 'create-project', label: 'Create a project', description: 'Everything else is filed against a project.', permission: 'project.create', href: '/dashboard/projects', guideId: 'projects.create' },
  { key: 'submit-daily-report', label: 'Submit a daily report', description: 'Record a day’s work, labour and issues from site.', permission: 'dailyReport.write', href: '/dashboard/daily-reports', guideId: 'daily-reports.submit' },
  { key: 'record-attendance', label: 'Record attendance', description: 'Mark a crew present for the day.', permission: 'attendance.mark', href: '/dashboard/workforce', guideId: 'workforce.mark-attendance' },
  { key: 'add-store', label: 'Add a store', description: 'Set up a warehouse or site store to hold stock.', permission: 'warehouse.manage', href: '/dashboard/inventory', guideId: 'materials.stores' },
  { key: 'raise-purchase-order', label: 'Raise a purchase order', description: 'Order material for a project.', permission: 'po.create', href: '/dashboard/procurement', guideId: 'procurement.purchase-order' },
  { key: 'add-boq', label: 'Add a BOQ', description: 'Set up a contract and its bill of quantities for RA billing.', permission: 'contract.manage', href: '/dashboard/billing?tab=contracts', guideId: 'billing.contracts' },
];

export function visibleChecklistSteps(can: (permission: Permission) => boolean): ChecklistStep[] {
  return CHECKLIST_STEPS.filter((step) => can(step.permission));
}
