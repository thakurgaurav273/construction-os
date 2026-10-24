import { Injectable } from '@nestjs/common';
import type { Permission } from '@sitepilot/types';
import { PrismaService } from '../../database/prisma.service';

export type ApprovalKind = 'purchase_orders' | 'vendor_bills' | 'payments' | 'payment_releases' | 'daily_reports' | 'stock_transfers' | 'ra_bills';

export interface ApprovalQueue {
  kind: ApprovalKind;
  label: string;
  count: number;
  href: string;
}

export interface PendingApprovals {
  total: number;
  queues: ApprovalQueue[];
}

interface Approver {
  id: string;
  organizationId: string;
  permissions: Permission[];
}

interface QueueDefinition {
  kind: ApprovalKind;
  label: string;
  href: string;
  permission: Permission;
  count: (approver: Approver) => Promise<number>;
}

/**
 * What is waiting for this member's decision, by the permissions their role grants. Maker-checker rules
 * mirror the workflows: nobody is asked to approve their own request. Nullable "requested by" columns are
 * matched explicitly, because Prisma's NOT leaves out rows where the column is null.
 */
@Injectable()
export class PendingApprovalsService {
  private readonly queues: QueueDefinition[];

  constructor(private readonly prisma: PrismaService) {
    this.queues = [
      {
        kind: 'purchase_orders', label: 'Purchase orders to approve', href: '/dashboard/procurement', permission: 'po.approve',
        count: ({ id, organizationId }) => this.prisma.purchaseOrder.count({ where: { organizationId, status: 'PENDING', OR: [{ requestedById: null }, { NOT: { requestedById: id } }] } }),
      },
      {
        kind: 'vendor_bills', label: 'Vendor bills to approve', href: '/dashboard/finance', permission: 'invoice.approve',
        count: ({ id, organizationId }) => this.prisma.invoice.count({ where: { organizationId, status: 'PENDING_APPROVAL', OR: [{ createdById: null }, { NOT: { createdById: id } }] } }),
      },
      {
        kind: 'payments', label: 'Payments to approve', href: '/dashboard/finance', permission: 'payment.approve',
        count: ({ id, organizationId }) => this.prisma.payment.count({ where: { organizationId, status: 'PENDING', OR: [{ requestedById: null }, { NOT: { requestedById: id } }] } }),
      },
      {
        kind: 'payment_releases', label: 'Approved payments to release', href: '/dashboard/finance', permission: 'payment.release',
        count: ({ organizationId }) => this.prisma.payment.count({ where: { organizationId, status: 'APPROVED' } }),
      },
      {
        kind: 'daily_reports', label: 'Daily reports to review', href: '/dashboard/daily-reports', permission: 'dailyReport.approve',
        count: ({ id, organizationId }) => this.prisma.dailyReport.count({ where: { organizationId, status: 'SUBMITTED', NOT: { submittedById: id } } }),
      },
      {
        kind: 'stock_transfers', label: 'Stock transfers to approve', href: '/dashboard/inventory', permission: 'inventory.transfer',
        count: ({ id, organizationId }) => this.prisma.stockTransfer.count({ where: { organizationId, status: 'PENDING', NOT: { requestedById: id } } }),
      },
      {
        // Client bills record the client's own certificate; only subcontract bills are maker-checker.
        kind: 'ra_bills', label: 'RA bills to certify', href: '/dashboard/billing', permission: 'billing.certify',
        count: ({ id, organizationId }) => this.prisma.raBill.count({
          where: {
            organizationId,
            status: 'SUBMITTED',
            OR: [{ contract: { direction: 'CLIENT' } }, { NOT: { preparedById: id } }, { preparedById: null }],
          },
        }),
      },
    ];
  }

  async forMember(approver: Approver): Promise<PendingApprovals> {
    const allowed = this.queues.filter((queue) => approver.permissions.includes(queue.permission));
    const counted = await Promise.all(allowed.map(async (queue) => ({
      kind: queue.kind, label: queue.label, href: queue.href, count: await queue.count(approver),
    })));
    const queues = counted.filter((queue) => queue.count > 0);
    return { total: queues.reduce((sum, queue) => sum + queue.count, 0), queues };
  }
}
