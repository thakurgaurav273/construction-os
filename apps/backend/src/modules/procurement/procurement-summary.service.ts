import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { OPEN_DELIVERY_STATUSES, OPEN_RFQ_STATUSES, RFQ_CLOSING_SOON_DAYS, STALE_APPROVAL_DAYS } from './procurement.constants';
import { addUtcDays, monthKey, roundMoney, toNumber, wholeDaysBetween } from './procurement-math';
import { isOrderOverdue } from './purchase-order.mapper';

const ATTENTION_LIMIT = 3;
const UPCOMING_DELIVERY_DAYS = 7;

export interface ProcurementSummary {
  openRfqs: number;
  rfqsClosingSoon: number;
  pendingApprovals: number;
  pendingValue: number;
  oldestPendingDays: number | null;
  approvedThisQuarter: number;
  approvedLastQuarter: number;
  /** Value of orders approved this calendar month. */
  committedThisMonth: number;
  committedLastMonth: number;
  activeVendors: number;
  overdueOrders: number;
  deliveriesDueThisWeek: number;
  attention: {
    overdueOrders: { id: string; poNumber: string; vendorName: string | null; daysLate: number }[];
    stalePendingOrders: { id: string; poNumber: string; daysWaiting: number; amount: number }[];
    closingRfqs: {
      id: string; rfqNumber: string; title: string; daysLeft: number; quotesReceived: number; vendorsInvited: number;
    }[];
  };
}

function quarterIndex(date: Date): number {
  return date.getUTCFullYear() * 4 + Math.floor(date.getUTCMonth() / 3);
}

@Injectable()
export class ProcurementSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: string): Promise<ProcurementSummary> {
    const today = new Date();
    const [orders, openRfqs, activeVendors, deliveriesDueThisWeek] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: { organizationId, status: { in: ['PENDING', 'APPROVED'] } },
        select: {
          id: true, poNumber: true, status: true, amount: true, submittedAt: true, reviewedAt: true,
          expectedDelivery: true, vendor: { select: { name: true } },
          items: { select: { quantity: true, receivedQuantity: true } },
        },
      }),
      this.prisma.rfq.findMany({
        where: { organizationId, status: { in: OPEN_RFQ_STATUSES } },
        select: {
          id: true, rfqNumber: true, title: true, status: true, closingDate: true,
          invitations: { select: { status: true } },
        },
      }),
      this.prisma.vendor.count({ where: { organizationId, status: 'ACTIVE' } }),
      this.prisma.delivery.count({
        where: {
          organizationId,
          status: { in: OPEN_DELIVERY_STATUSES },
          scheduledDate: { lte: addUtcDays(today, UPCOMING_DELIVERY_DAYS) },
        },
      }),
    ]);

    const pending = orders.filter((order) => order.status === 'PENDING');
    const approved = orders.filter((order) => order.status === 'APPROVED' && order.reviewedAt);
    const thisMonth = monthKey(today);
    const lastMonth = monthKey(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)));
    const valueApprovedIn = (month: string): number => roundMoney(approved
      .filter((order) => order.reviewedAt && monthKey(order.reviewedAt) === month)
      .reduce((sum, order) => sum + toNumber(order.amount), 0));

    const waiting = pending
      .map((order) => ({
        id: order.id,
        poNumber: order.poNumber,
        amount: toNumber(order.amount),
        daysWaiting: wholeDaysBetween(order.submittedAt ?? today, today),
      }))
      .sort((a, b) => b.daysWaiting - a.daysWaiting);

    const overdue = approved
      .filter((order) => isOrderOverdue(order, today))
      .map((order) => ({
        id: order.id,
        poNumber: order.poNumber,
        vendorName: order.vendor?.name ?? null,
        daysLate: wholeDaysBetween(order.expectedDelivery, today),
      }))
      .sort((a, b) => b.daysLate - a.daysLate);

    const closingRfqs = openRfqs
      .filter((rfq) => rfq.status === 'OPEN')
      .map((rfq) => ({
        id: rfq.id,
        rfqNumber: rfq.rfqNumber,
        title: rfq.title,
        daysLeft: wholeDaysBetween(today, rfq.closingDate),
        quotesReceived: rfq.invitations.filter((invitation) => invitation.status === 'QUOTED').length,
        vendorsInvited: rfq.invitations.length,
      }))
      .filter((rfq) => rfq.daysLeft <= RFQ_CLOSING_SOON_DAYS)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    const currentQuarter = quarterIndex(today);
    return {
      openRfqs: openRfqs.length,
      rfqsClosingSoon: closingRfqs.filter((rfq) => rfq.daysLeft >= 0).length,
      pendingApprovals: pending.length,
      pendingValue: roundMoney(waiting.reduce((sum, order) => sum + order.amount, 0)),
      oldestPendingDays: waiting[0]?.daysWaiting ?? null,
      approvedThisQuarter: approved.filter((order) => order.reviewedAt && quarterIndex(order.reviewedAt) === currentQuarter).length,
      approvedLastQuarter: approved.filter((order) => order.reviewedAt && quarterIndex(order.reviewedAt) === currentQuarter - 1).length,
      committedThisMonth: valueApprovedIn(thisMonth),
      committedLastMonth: valueApprovedIn(lastMonth),
      activeVendors,
      overdueOrders: overdue.length,
      deliveriesDueThisWeek,
      attention: {
        overdueOrders: overdue.slice(0, ATTENTION_LIMIT),
        stalePendingOrders: waiting.filter((order) => order.daysWaiting > STALE_APPROVAL_DAYS).slice(0, ATTENTION_LIMIT),
        closingRfqs: closingRfqs.slice(0, ATTENTION_LIMIT),
      },
    };
  }
}
