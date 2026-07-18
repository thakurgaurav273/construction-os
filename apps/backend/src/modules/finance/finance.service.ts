import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

function num(d: Prisma.Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === 'number' ? d : Number(d);
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(organizationId: string) {
    const budgetItems = await this.prisma.budgetItem.findMany({ where: { organizationId } });
    const invoices = await this.prisma.invoice.findMany({ where: { organizationId } });
    const payments = await this.prisma.payment.findMany({ where: { organizationId } });

    const totalBudget = budgetItems.reduce((s, b) => s + num(b.allocated), 0);
    const totalSpent = budgetItems.reduce((s, b) => s + num(b.spent), 0);
    const totalCommitted = budgetItems.reduce((s, b) => s + num(b.committed), 0);
    const pendingPayments = payments.filter((p) => p.status === 'PENDING' || p.status === 'APPROVED').reduce((s, p) => s + num(p.amount), 0);
    const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE').length;

    const cashFlow = await this.prisma.cashFlowEntry.findMany({ where: { organizationId }, orderBy: [{ year: 'desc' }, { month: 'desc' }], take: 1 });
    const latestCf = cashFlow[0];
    const netCashFlow = latestCf ? num(latestCf.inflow) - num(latestCf.outflow) : 0;

    return {
      totalBudget,
      totalSpent,
      remainingBudget: totalBudget - totalSpent,
      totalCommitted,
      pendingPayments,
      overdueInvoices,
      netCashFlow,
      budgetVariance: totalBudget - totalSpent - totalCommitted,
    };
  }

  async getInvoices(organizationId: string) {
    const rows = await this.prisma.invoice.findMany({
      where: { organizationId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: { issuedDate: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      invoiceNumber: r.invoiceNumber,
      vendorName: r.vendorName,
      projectId: r.projectId,
      projectName: r.project?.name ?? '',
      category: r.category,
      description: r.description,
      amount: num(r.amount),
      taxAmount: num(r.taxAmount),
      totalAmount: num(r.totalAmount),
      status: r.status,
      issuedDate: iso(r.issuedDate),
      dueDate: iso(r.dueDate),
      paidDate: iso(r.paidDate),
      notes: r.notes,
    }));
  }

  async getPayments(organizationId: string) {
    const rows = await this.prisma.payment.findMany({
      where: { organizationId },
      include: { project: { select: { id: true, name: true } }, invoice: { select: { invoiceNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      paymentNumber: r.paymentNumber,
      invoiceNumber: r.invoice?.invoiceNumber ?? null,
      vendorName: r.vendorName,
      projectId: r.projectId,
      projectName: r.project?.name ?? '',
      category: r.category,
      amount: num(r.amount),
      status: r.status,
      method: r.method,
      reference: r.reference,
      dueDate: iso(r.dueDate),
      paidDate: iso(r.paidDate),
      approvedBy: r.approvedBy,
      notes: r.notes,
    }));
  }

  async getBudget(organizationId: string) {
    const rows = await this.prisma.budgetItem.findMany({
      where: { organizationId },
      include: { project: { select: { id: true, name: true } } },
      orderBy: [{ projectId: 'asc' }, { category: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      projectName: r.project?.name ?? '',
      category: r.category,
      allocated: num(r.allocated),
      spent: num(r.spent),
      committed: num(r.committed),
      remaining: num(r.allocated) - num(r.spent) - num(r.committed),
      variance: num(r.allocated) - num(r.spent),
      utilizationPercent: num(r.allocated) > 0 ? Math.round((num(r.spent) / num(r.allocated)) * 100) : 0,
    }));
  }

  async getCashFlow(organizationId: string) {
    const rows = await this.prisma.cashFlowEntry.findMany({
      where: { organizationId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });
    return rows.map((r) => ({
      id: r.id,
      month: r.month,
      year: r.year,
      inflow: num(r.inflow),
      outflow: num(r.outflow),
      net: num(r.inflow) - num(r.outflow),
      forecastInflow: num(r.forecastInflow),
      forecastOutflow: num(r.forecastOutflow),
      forecastNet: num(r.forecastInflow) - num(r.forecastOutflow),
    }));
  }

  async getInsights(organizationId: string) {
    const budget = await this.getBudget(organizationId);
    const invoices = await this.getInvoices(organizationId);
    const payments = await this.getPayments(organizationId);
    const stats = await this.getStats(organizationId);

    const insights: { id: string; tone: string; title: string; body: string }[] = [];
    let idx = 1;

    // Budget overruns
    const overruns = budget.filter((b) => b.spent > b.allocated * 0.9);
    if (overruns.length > 0) {
      insights.push({ id: `fi-${idx++}`, tone: 'critical', title: 'Budget Overrun Risk', body: `${overruns.length} budget categories are at 90%+ utilization. Immediate review recommended for ${overruns[0].category} on ${overruns[0].projectName}.` });
    }

    // Overdue invoices
    const overdue = invoices.filter((i) => i.status === 'OVERDUE');
    if (overdue.length > 0) {
      const total = overdue.reduce((s, i) => s + i.totalAmount, 0);
      insights.push({ id: `fi-${idx++}`, tone: 'warning', title: 'Overdue Invoices', body: `${overdue.length} invoice(s) totalling ₹${(total / 100000).toFixed(1)}L are past due. Follow up with ${overdue[0].vendorName} for ${overdue[0].invoiceNumber}.` });
    }

    // Pending payments
    const pending = payments.filter((p) => p.status === 'PENDING');
    if (pending.length > 0) {
      const total = pending.reduce((s, p) => s + p.amount, 0);
      insights.push({ id: `fi-${idx++}`, tone: 'warning', title: 'Pending Payments', body: `${pending.length} payment(s) worth ₹${(total / 100000).toFixed(1)}L awaiting approval. Delays may impact vendor relationships.` });
    }

    // Cash flow positive
    if (stats.netCashFlow > 0) {
      insights.push({ id: `fi-${idx++}`, tone: 'positive', title: 'Positive Cash Flow', body: `Net cash flow is ₹${(stats.netCashFlow / 10000000).toFixed(2)}Cr. Organization has healthy liquidity for upcoming commitments.` });
    }

    // Savings opportunity
    const underUtilized = budget.filter((b) => b.utilizationPercent < 30 && b.allocated > 1000000);
    if (underUtilized.length > 0) {
      insights.push({ id: `fi-${idx++}`, tone: 'info', title: 'Reallocation Opportunity', body: `${underUtilized.length} budget categories are below 30% utilization. Consider reallocating funds from ${underUtilized[0].category} (${underUtilized[0].projectName}) to high-demand areas.` });
    }

    return insights;
  }
}
