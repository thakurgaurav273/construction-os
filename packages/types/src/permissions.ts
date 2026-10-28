/**
 * Every action that can be granted to a role. Roles are collections of these;
 * code checks permissions, never role names. The role → permission map lives in
 * the backend (common/permissions), organizations can adjust it per role and per
 * member, and each member's effective set reaches the frontend through /auth/me.
 * `*.view` permissions gate reading a module; actions in a module also need its view.
 */
export type Permission =
  | 'project.view'
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'project.members.manage'
  | 'dailyReport.view'
  | 'dailyReport.write'
  | 'dailyReport.approve'
  | 'document.upload'
  | 'document.delete'
  | 'workforce.view'
  | 'workforce.manage'
  | 'attendance.mark'
  | 'material.view'
  | 'material.manage'
  | 'material.issue'
  | 'material.request'
  | 'inventory.view'
  | 'inventory.adjust'
  | 'inventory.transfer'
  | 'warehouse.manage'
  | 'procurement.view'
  | 'vendor.manage'
  | 'rfq.manage'
  | 'rfq.award'
  | 'po.create'
  | 'po.approve'
  | 'delivery.receive'
  | 'finance.view'
  | 'budget.manage'
  | 'invoice.create'
  | 'invoice.approve'
  | 'payment.request'
  | 'payment.approve'
  | 'payment.release'
  | 'report.view'
  | 'report.manage'
  | 'billing.view'
  | 'contract.manage'
  | 'billing.prepare'
  | 'billing.certify'
  | 'billing.receipts'
  | 'members.manage'
  | 'roles.manage'
  | 'organization.manage'
  | 'audit.view'
  | 'data.import'
  | 'ai.use'
  | 'ai.history.view'
  | 'ai.manage';

export interface CurrentAccess {
  userId: string;
  organizationId: string;
  role: string;
  permissions: Permission[];
  /** SitePilot operator who can open the cross-tenant platform console. */
  isPlatformAdmin: boolean;
}
