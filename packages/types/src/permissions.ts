/**
 * Every action that can be granted to a role. Roles are collections of these;
 * code checks permissions, never role names. The role → permission map lives in
 * the backend (common/permissions) and reaches the frontend through /auth/me.
 */
export type Permission =
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'project.members.manage'
  | 'dailyReport.write'
  | 'dailyReport.approve'
  | 'document.upload'
  | 'document.delete'
  | 'workforce.manage'
  | 'attendance.mark'
  | 'material.manage'
  | 'material.issue'
  | 'inventory.adjust'
  | 'inventory.transfer'
  | 'warehouse.manage'
  | 'vendor.manage'
  | 'rfq.manage'
  | 'rfq.award'
  | 'po.create'
  | 'po.approve'
  | 'delivery.receive'
  | 'finance.view'
  | 'invoice.create'
  | 'invoice.approve'
  | 'payment.request'
  | 'payment.approve'
  | 'payment.release'
  | 'report.manage'
  | 'billing.view'
  | 'contract.manage'
  | 'billing.prepare'
  | 'billing.certify'
  | 'billing.receipts'
  | 'members.manage'
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
