import { OrgRole } from '@prisma/client';
import type { Permission } from '@sitepilot/types';

export interface PermissionInfo {
  group: string;
  label: string;
}

/** Typed as a full Record so adding a Permission without describing it fails to compile. */
export const PERMISSION_CATALOGUE: Record<Permission, PermissionInfo> = {
  'project.create': { group: 'Projects', label: 'Create projects' },
  'project.update': { group: 'Projects', label: 'Edit, archive and restore projects' },
  'project.delete': { group: 'Projects', label: 'Delete projects created by mistake' },
  'project.members.manage': { group: 'Projects', label: 'Assign people to projects' },
  'dailyReport.write': { group: 'Site', label: 'Write and submit daily reports' },
  'dailyReport.approve': { group: 'Site', label: 'Approve daily reports' },
  'document.upload': { group: 'Site', label: 'Upload documents and photos' },
  'document.delete': { group: 'Site', label: 'Delete documents' },
  'workforce.manage': { group: 'Workforce', label: 'Add and edit workers' },
  'attendance.mark': { group: 'Workforce', label: 'Mark attendance' },
  'material.manage': { group: 'Materials', label: 'Manage the material catalogue' },
  'material.issue': { group: 'Materials', label: 'Issue material to sites and take returns' },
  'inventory.adjust': { group: 'Materials', label: 'Adjust stock' },
  'inventory.transfer': { group: 'Materials', label: 'Request, approve and receive stock transfers' },
  'warehouse.manage': { group: 'Materials', label: 'Set up stores and bin locations' },
  'vendor.manage': { group: 'Procurement', label: 'Manage vendors' },
  'rfq.manage': { group: 'Procurement', label: 'Issue RFQs and record quotes' },
  'rfq.award': { group: 'Procurement', label: 'Award RFQs' },
  'po.create': { group: 'Procurement', label: 'Raise purchase orders' },
  'po.approve': { group: 'Procurement', label: 'Approve purchase orders' },
  'delivery.receive': { group: 'Procurement', label: 'Schedule and receive deliveries' },
  'finance.view': { group: 'Finance', label: 'View invoices, payments and budgets' },
  'invoice.create': { group: 'Finance', label: 'Record vendor invoices' },
  'invoice.approve': { group: 'Finance', label: 'Approve vendor invoices' },
  'payment.request': { group: 'Finance', label: 'Request payments' },
  'payment.approve': { group: 'Finance', label: 'Approve payments' },
  'payment.release': { group: 'Finance', label: 'Record released payments' },
  'report.manage': { group: 'Reports', label: 'Generate and schedule reports' },
  'members.manage': { group: 'Administration', label: 'Invite members and change roles' },
  'organization.manage': { group: 'Administration', label: 'Edit organization settings' },
  'audit.view': { group: 'Administration', label: 'View the audit log' },
  'ai.use': { group: 'AI', label: 'Use AI assistants and summaries' },
  'ai.history.view': { group: 'AI', label: 'See everyone’s AI chat history' },
  'ai.manage': { group: 'AI', label: 'Manage AI provider keys and request AI access' },
};

export const ALL_PERMISSIONS = Object.keys(PERMISSION_CATALOGUE) as Permission[];

const SITE_BASICS: Permission[] = ['dailyReport.write', 'document.upload', 'attendance.mark', 'delivery.receive', 'ai.use'];

/**
 * Default grants per role. Reading operational data needs no permission; every write and all financial
 * data does. Maker-checker rules (nobody approves their own PO, bill or payment) apply on top of these.
 */
export const ROLE_PERMISSIONS: Record<OrgRole, readonly Permission[]> = {
  OWNER: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS,
  PROJECT_MANAGER: [
    ...SITE_BASICS,
    'project.create', 'project.update', 'project.members.manage', 'dailyReport.approve', 'document.delete',
    'workforce.manage', 'material.manage', 'material.issue', 'inventory.transfer', 'warehouse.manage',
    'rfq.manage', 'rfq.award', 'po.create', 'po.approve',
    // Project managers certify bills for work on their sites; finance releases the money.
    'finance.view', 'invoice.approve',
    'report.manage',
  ],
  SITE_ENGINEER: [...SITE_BASICS, 'po.create'],
  STORE_MANAGER: [
    'ai.use', 'document.upload', 'delivery.receive', 'material.manage', 'material.issue', 'inventory.adjust', 'inventory.transfer',
    'warehouse.manage',
  ],
  PROCUREMENT: ['ai.use', 'document.upload', 'delivery.receive', 'vendor.manage', 'rfq.manage', 'rfq.award', 'po.create'],
  FINANCE: [
    'ai.use', 'document.upload', 'finance.view', 'invoice.create', 'invoice.approve',
    'payment.request', 'payment.approve', 'payment.release', 'report.manage',
  ],
  VIEWER: [],
};

export function permissionsForRole(role: OrgRole): Permission[] {
  return [...new Set(ROLE_PERMISSIONS[role])];
}

/** Roles whose defaults include the permission, e.g. to find who can approve something. */
export function rolesWithPermission(permission: Permission): OrgRole[] {
  return Object.values(OrgRole).filter((role) => ROLE_PERMISSIONS[role].includes(permission));
}
