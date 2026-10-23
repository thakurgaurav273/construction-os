import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { monthKey, roundMoney, toNumber, wholeDaysBetween } from '../procurement/procurement-math';
import { ATTENTION_LIMIT, DUE_SOON_DAYS } from './finance.constants';
import { BudgetService } from './budget.service';
import { InvoicesService } from './invoices.service';

/** Budget lines at or above this utilization are called out as overrun risks. */
const BUDGET_RISK_PERCENT = 90;

export interface FinanceSummary {
  budget: { allocated: number; spent: number; committed: number; remaining: number; utilizationPercent: number };
  payables: { outstanding: number; overdueAmount: number; overdueCount: number; dueSoonAmount: number; dueSoonCount: number };
  approvals: {
    invoicesPending: number;
    invoicesPendingValue: number;
    invoicesWithVariance: number;
    paymentsPending: number;
    paymentsPendingValue: number;
    /** Approved payments waiting for the bank transfer to be recorded. */
    paymentsToRelease: number;
    paymentsToReleaseValue: number;
  };
  paidThisMonth: number;
  paidLastMonth: number;
  netCashFlow: number;
  attention: {
    overdueInvoices: { id: string; invoiceNumber: string; vendorName: string; balanceDue: number; daysOverdue: number }[];
    varianceInvoices: { id: string; invoiceNumber: string; vendorName: string; totalAmount: number }[];
    budgetRisks: { projectName: string; category: string; utilizationPercent: number }[];
  };
}

const sum = (values: number[]): number => roundMoney(values.reduce((total, value) => total + value, 0));

@Injectable()
export class FinanceSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoicesService,
    private readonly budgets: BudgetService,
  ) {}

  async getSummary(organizationId: string): Promise<FinanceSummary> {
    const today = new Date();
    const [invoices, payments, budgetLines, latestCashFlow] = await Promise.all([
      this.invoices.findAll(organizationId, {}),
      this.prisma.payment.findMany({ where: { organizationId }, select: { amount: true, status: true, paidDate: true } }),
      this.budgets.lines(organizationId),
      this.prisma.cashFlowEntry.findFirst({ where: { organizationId }, orderBy: [{ year: 'desc' }, { month: 'desc' }] }),
    ]);

    const payable = invoices.filter((invoice) => invoice.balanceDue > 0);
    const overdue = payable.filter((invoice) => invoice.isOverdue).sort((a, b) => b.daysOverdue - a.daysOverdue);
    const dueSoon = payable.filter((invoice) => {
      const daysLeft = wholeDaysBetween(today, invoice.dueDate);
      return daysLeft >= 0 && daysLeft <= DUE_SOON_DAYS;
    });
    const pendingInvoices = invoices.filter((invoice) => invoice.status === 'PENDING_APPROVAL');
    const varianceInvoices = pendingInvoices.filter((invoice) => invoice.matchStatus === 'VARIANCE');

    const amountOf = (status: string): number[] => payments.filter((payment) => payment.status === status).map((payment) => toNumber(payment.amount));
    const thisMonth = monthKey(today);
    const lastMonth = monthKey(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)));
    const paidIn = (month: string): number => sum(payments
      .filter((payment) => payment.status === 'PAID' && payment.paidDate && monthKey(payment.paidDate) === month)
      .map((payment) => toNumber(payment.amount)));

    const allocated = sum(budgetLines.map((line) => line.allocated));
    const spent = sum(budgetLines.map((line) => line.spent));
    const committed = sum(budgetLines.map((line) => line.committed));

    return {
      budget: {
        allocated,
        spent,
        committed,
        remaining: roundMoney(allocated - spent - committed),
        utilizationPercent: allocated > 0 ? Math.round((spent / allocated) * 100) : 0,
      },
      payables: {
        outstanding: sum(payable.map((invoice) => invoice.balanceDue)),
        overdueAmount: sum(overdue.map((invoice) => invoice.balanceDue)),
        overdueCount: overdue.length,
        dueSoonAmount: sum(dueSoon.map((invoice) => invoice.balanceDue)),
        dueSoonCount: dueSoon.length,
      },
      approvals: {
        invoicesPending: pendingInvoices.length,
        invoicesPendingValue: sum(pendingInvoices.map((invoice) => invoice.totalAmount)),
        invoicesWithVariance: varianceInvoices.length,
        paymentsPending: amountOf('PENDING').length,
        paymentsPendingValue: sum(amountOf('PENDING')),
        paymentsToRelease: amountOf('APPROVED').length,
        paymentsToReleaseValue: sum(amountOf('APPROVED')),
      },
      paidThisMonth: paidIn(thisMonth),
      paidLastMonth: paidIn(lastMonth),
      netCashFlow: latestCashFlow ? roundMoney(toNumber(latestCashFlow.inflow) - toNumber(latestCashFlow.outflow)) : 0,
      attention: {
        overdueInvoices: overdue.slice(0, ATTENTION_LIMIT).map((invoice) => ({
          id: invoice.id, invoiceNumber: invoice.invoiceNumber, vendorName: invoice.vendorName,
          balanceDue: invoice.balanceDue, daysOverdue: invoice.daysOverdue,
        })),
        varianceInvoices: varianceInvoices.slice(0, ATTENTION_LIMIT).map((invoice) => ({
          id: invoice.id, invoiceNumber: invoice.invoiceNumber, vendorName: invoice.vendorName, totalAmount: invoice.totalAmount,
        })),
        budgetRisks: budgetLines
          .filter((line) => line.utilizationPercent >= BUDGET_RISK_PERCENT)
          .sort((a, b) => b.utilizationPercent - a.utilizationPercent)
          .slice(0, ATTENTION_LIMIT)
          .map(({ projectName, category, utilizationPercent }) => ({ projectName, category, utilizationPercent })),
      },
    };
  }
}
