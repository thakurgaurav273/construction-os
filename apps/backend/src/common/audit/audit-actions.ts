export interface AuditActionInfo {
  /** Past tense, read as "<actor> <label>", e.g. "Ananya approved purchase order". */
  label: string;
  entityType: string;
}

const action = (label: string, entityType: string): AuditActionInfo => ({ label, entityType });

/**
 * Every auditable action. Endpoints name one of these in `@Audit(...)`, so an action can't be misspelled
 * and every action has a readable label for the audit log screen.
 */
export const AUDIT_ACTIONS = {
  'auth.registered': action('created the organization', 'organization'),
  'auth.signed_in': action('signed in', 'user'),
  'auth.password_reset': action('reset their password', 'user'),
  'organization.updated': action('updated organization settings', 'organization'),
  'organization.logo_updated': action('uploaded a new organization logo', 'organization'),
  'organization.logo_removed': action('removed the organization logo', 'organization'),
  'invitation.accepted': action('joined the organization', 'user'),

  'member.role_changed': action('changed a member\'s role', 'member'),
  'member.removed': action('removed a member', 'member'),
  'invitation.sent': action('invited a member', 'invitation'),
  'invitation.resent': action('resent an invitation', 'invitation'),
  'invitation.cancelled': action('cancelled an invitation', 'invitation'),

  'project.created': action('created a project', 'project'),
  'project.updated': action('updated a project', 'project'),
  'project.member_added': action('added a member to a project', 'project'),
  'project.member_role_changed': action('changed a project member\'s role', 'project'),
  'project.member_removed': action('removed a member from a project', 'project'),
  'project.archived': action('archived a project', 'project'),
  'project.restored': action('restored a project', 'project'),
  'project.deleted': action('deleted a project', 'project'),

  'daily_report.created': action('created a daily report', 'daily_report'),
  'daily_report.updated': action('edited a daily report', 'daily_report'),
  'daily_report.submitted': action('submitted a daily report', 'daily_report'),
  'daily_report.approved': action('approved a daily report', 'daily_report'),
  'daily_report.rejected': action('sent back a daily report', 'daily_report'),
  'daily_report.attachment_added': action('attached a file to a daily report', 'daily_report'),
  'daily_report.attachment_removed': action('removed a file from a daily report', 'daily_report'),
  'document.uploaded': action('uploaded a document', 'document'),
  'document.deleted': action('deleted a document', 'document'),

  'worker.created': action('added a worker', 'worker'),
  'worker.updated': action('updated a worker', 'worker'),
  'worker.deactivated': action('deactivated a worker', 'worker'),
  'worker.reactivated': action('reactivated a worker', 'worker'),
  'attendance.marked': action('marked attendance', 'attendance'),
  'attendance.checked_in': action('checked a worker in', 'attendance'),
  'attendance.checked_out': action('checked a worker out', 'attendance'),

  'material.created': action('added a material', 'material'),
  'material.updated': action('updated a material', 'material'),
  'material.archived': action('archived a material', 'material'),
  'material.issued': action('issued material to a project', 'material_issue'),
  'material.returned': action('recorded a material return', 'material_issue'),
  'material.plan_set': action('set a planned material quantity', 'material'),

  'inventory_item.updated': action('updated store item settings', 'inventory_item'),
  'warehouse.created': action('added a store', 'warehouse'),
  'warehouse.updated': action('updated a store', 'warehouse'),
  'warehouse.archived': action('archived a store', 'warehouse'),
  'warehouse_location.created': action('added a bin location', 'warehouse'),
  'warehouse_location.updated': action('updated a bin location', 'warehouse'),
  'warehouse_location.removed': action('removed a bin location', 'warehouse'),
  'transfer.requested': action('requested a stock transfer', 'stock_transfer'),
  'transfer.approved': action('approved a stock transfer', 'stock_transfer'),
  'transfer.rejected': action('rejected a stock transfer', 'stock_transfer'),
  'transfer.cancelled': action('cancelled a stock transfer', 'stock_transfer'),
  'transfer.received': action('received a stock transfer', 'stock_transfer'),
  'stock.adjusted': action('adjusted stock', 'stock_adjustment'),

  'vendor.created': action('added a vendor', 'vendor'),
  'vendor.updated': action('updated a vendor', 'vendor'),
  'vendor.deactivated': action('deactivated a vendor', 'vendor'),
  'vendor.reactivated': action('reactivated a vendor', 'vendor'),
  'rfq.created': action('created an RFQ', 'rfq'),
  'rfq.vendors_invited': action('invited vendors to an RFQ', 'rfq'),
  'rfq.quote_recorded': action('recorded a quote', 'rfq'),
  'rfq.vendor_declined': action('recorded a vendor decline', 'rfq'),
  'rfq.closed': action('closed an RFQ', 'rfq'),
  'rfq.cancelled': action('cancelled an RFQ', 'rfq'),
  'rfq.awarded': action('awarded an RFQ', 'rfq'),
  'purchase_order.created': action('created a purchase order', 'purchase_order'),
  'purchase_order.updated': action('edited a purchase order', 'purchase_order'),
  'purchase_order.duplicated': action('duplicated a purchase order', 'purchase_order'),
  'purchase_order.submitted': action('submitted a purchase order', 'purchase_order'),
  'purchase_order.approved': action('approved a purchase order', 'purchase_order'),
  'purchase_order.rejected': action('rejected a purchase order', 'purchase_order'),
  'purchase_order.changes_requested': action('requested changes to a purchase order', 'purchase_order'),
  'purchase_order.cancelled': action('cancelled a purchase order', 'purchase_order'),
  'delivery.scheduled': action('scheduled a delivery', 'purchase_order'),
  'delivery.goods_received': action('recorded a goods receipt', 'purchase_order'),
  'delivery.in_transit': action('marked a delivery in transit', 'delivery'),
  'delivery.cancelled': action('cancelled a delivery', 'delivery'),

  'invoice.created': action('recorded a vendor invoice', 'invoice'),
  'invoice.updated': action('edited a vendor invoice', 'invoice'),
  'invoice.submitted': action('submitted an invoice for approval', 'invoice'),
  'invoice.approved': action('approved an invoice', 'invoice'),
  'invoice.rejected': action('rejected an invoice', 'invoice'),
  'invoice.cancelled': action('cancelled an invoice', 'invoice'),
  'payment.requested': action('requested a payment', 'payment'),
  'payment.approved': action('approved a payment', 'payment'),
  'payment.rejected': action('rejected a payment', 'payment'),
  'payment.released': action('recorded a released payment', 'payment'),
  'payment.cancelled': action('cancelled a payment', 'payment'),

  'report.generated': action('generated a report', 'report'),
  'report.deleted': action('deleted a report', 'report'),
  'report_schedule.created': action('scheduled a report', 'report_schedule'),
  'report_schedule.updated': action('updated a report schedule', 'report_schedule'),
  'report_schedule.toggled': action('paused or resumed a report schedule', 'report_schedule'),
  'report_schedule.deleted': action('deleted a report schedule', 'report_schedule'),
} as const satisfies Record<string, AuditActionInfo>;

export type AuditAction = keyof typeof AUDIT_ACTIONS;

export function isAuditAction(value: string): value is AuditAction {
  return Object.prototype.hasOwnProperty.call(AUDIT_ACTIONS, value);
}
