import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { loadReceivables } from '../billing/receivables.service';
import { RetentionBalances, retentionBalances } from '../billing/retention.service';
import { monthKey, roundMoney, toNumber, wholeDaysBetween } from '../procurement/procurement-math';
import { ATTENTION_LIMIT, DUE_SOON_DAYS } from './finance.constants';
import { BudgetService } from './budget.service';
import { ForecastBucket, cashForecast } from './cash-forecast';
import { InvoicesService } from './invoices.service';

/** Budget lines at or above this utilization are called out as overrun risks. */
const BUDGET_RISK_PERCENT = 90;

export interface FinanceSummary {
  budget: { allocated: number; spent: number; committed: number; remaining: number; utilizationPercent: number };
  payables: DueSummary;
  /** What clients owe on certified client RA bills. */
  receivables: DueSummary;
  retention: RetentionBalances;
  /** Expected in and out from bills already on the books, by when they fall due. */
  forecast: ForecastBucket[];
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

interface DueSummary { outstanding: number; overdueAmount: number; overdueCount: number; dueSoonAmount: number; dueSoonCount: number }

const sum = (values: number[]): number => roundMoney(values.reduce((total, value) => total + value, 0));

/** Outstanding amounts split into overdue and falling due within DUE_SOON_DAYS. */
function dueSummary(items: { outstanding: number; dueDate: Date }[], today: Date): DueSummary {
  const daysLeft = (item: { dueDate: Date }): number => wholeDaysBetween(today, item.dueDate);
  const overdue = items.filter((item) => daysLeft(item) < 0);
  const dueSoon = items.filter((item) => daysLeft(item) >= 0 && daysLeft(item) <= DUE_SOON_DAYS);
  return {
    outstanding: sum(items.map((item) => item.outstanding)),
    overdueAmount: sum(overdue.map((item) => item.outstanding)),
    overdueCount: overdue.length,
    dueSoonAmount: sum(dueSoon.map((item) => item.outstanding)),
    dueSoonCount: dueSoon.length,
  };
}

@Injectable()
export class FinanceSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoicesService,
    private readonly budgets: BudgetService,
  ) {}

  async getSummary(organizationId: string): Promise<FinanceSummary> {
    const today = new Date();
    const [invoices, receivables, retention, payments, budgetLines, latestCashFlow] = await Promise.all([
      this.invoices.findAll(organizationId, {}),
      loadReceivables(this.prisma, organizationId),
      retentionBalances(this.prisma, organizationId),
      this.prisma.payment.findMany({ where: { organizationId }, select: { amount: true, status: true, paidDate: true } }),
      this.budgets.lines(organizationId),
      this.prisma.cashFlowEntry.findFirst({ where: { organizationId }, orderBy: [{ year: 'desc' }, { month: 'desc' }] }),
    ]);

    const payable = invoices.filter((invoice) => invoice.balanceDue > 0);
    const overdue = payable.filter((invoice) => invoice.isOverdue).sort((a, b) => b.daysOverdue - a.daysOverdue);
    const payableDue = payable.map((invoice) => ({ outstanding: invoice.balanceDue, dueDate: invoice.dueDate }));
    // Certified bills always get a due date; one without is treated as due today.
    const receivableDue = receivables.items.map((item) => ({ outstanding: item.outstanding, dueDate: item.dueDate ?? today }));
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
      payables: dueSummary(payableDue, today),
      receivables: dueSummary(receivableDue, today),
      retention,
      forecast: cashForecast(
        receivableDue.map((item) => ({ amount: item.outstanding, dueDate: item.dueDate })),
        payableDue.map((item) => ({ amount: item.outstanding, dueDate: item.dueDate })),
        today,
      ),
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
