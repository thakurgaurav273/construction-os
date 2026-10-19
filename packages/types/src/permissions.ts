/**
 * Every action that can be granted to a role. Roles are collections of these;
 * code checks permissions, never role names. The role → permission map lives in
 * the backend (common/permissions) and reaches the frontend through /auth/me.
 */
export type Permission =
  | 'project.create'
  | 'project.update'
  | 'project.members.manage'
  | 'dailyReport.write'
  | 'dailyReport.approve'
  | 'document.upload'
  | 'document.delete'
  | 'workforce.manage'
  | 'attendance.mark'
  | 'material.manage'
  | 'inventory.adjust'
  | 'inventory.transfer'
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
  | 'members.manage'
  | 'organization.manage';

export interface CurrentAccess {
  userId: string;
  organizationId: string;
  role: string;
  permissions: Permission[];
}
