import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  // Get available report templates
  getTemplates() {
    return [
      { id: 'EXECUTIVE', name: 'Executive Summary', description: 'High-level overview of all active projects, financials, and major risks.', icon: 'LayoutDashboard' },
      { id: 'COST', name: 'Cost Analysis', description: 'Detailed budget tracking, variances, and procurement spend.', icon: 'PieChart' },
      { id: 'WORKFORCE', name: 'Workforce Report', description: 'Attendance trends, trade distribution, and overtime analytics.', icon: 'Users' },
      { id: 'SCHEDULE', name: 'Schedule Progress', description: 'Milestone tracking, critical path analysis, and delays.', icon: 'BarChart3' },
      { id: 'PROCUREMENT', name: 'Procurement Report', description: 'Purchase orders, RFQs, deliveries, and vendor performance.', icon: 'ShoppingCart' },
      { id: 'INVENTORY', name: 'Inventory Report', description: 'Stock levels, movements, and warehouse analytics.', icon: 'Package' },
      { id: 'FINANCIAL', name: 'Financial Report', description: 'Invoices, payments, cash flow, and budget utilization.', icon: 'Wallet' },
      { id: 'SAFETY', name: 'Safety & Compliance', description: 'Incident reports, site audits, and compliance metrics.', icon: 'ShieldAlert' },
    ];
  }

  // Generate a report - aggregates data from all modules
  async generate(input: { type: string; projectIds?: string[]; name: string; format: string; userId: string }, organizationId: string) {
    const { type, projectIds, name, format, userId } = input;
    
    // Get or create template report
    let templateReport = await this.prisma.report.findFirst({ where: { type, organizationId } });
    if (!templateReport) {
      templateReport = await this.prisma.report.create({
        data: { name: input.name || type, type, description: `Auto-generated ${type} report`, projects: projectIds ?? [], organizationId, createdBy: userId },
      });
    }

    // Create generated report record
    const generated = await this.prisma.generatedReport.create({
      data: {
        reportId: templateReport.id,
        name,
        type,
        format,
        status: 'GENERATING',
        generatedBy: userId,
        organizationId,
        projectId: projectIds?.[0] ?? null,
      },
    });

    // Aggregate data based on report type
    const data = await this.aggregateReportData(type, organizationId, projectIds);

    // Update with data and mark complete
    return this.prisma.generatedReport.update({
      where: { id: generated.id },
      data: {
        status: 'COMPLETED',
        data,
        fileSize: JSON.stringify(data).length,
      },
    });
  }

  private async aggregateReportData(type: string, orgId: string, projectIds?: string[]) {
    const projectFilter = projectIds?.length ? { id: { in: projectIds } } : { organizationId: orgId };
    
    const [projects, dailyReports, purchaseOrders, inventory, finance, workforce] = await Promise.all([
      this.prisma.project.findMany({ where: projectFilter, select: { id: true, name: true, code: true, status: true, progress: true, budget: true, spent: true } }),
      this.prisma.dailyReport.findMany({ where: { project: projectFilter }, take: 100, orderBy: { date: 'desc' } }),
      this.prisma.purchaseOrder.findMany({ where: { organizationId: orgId, ...(projectIds?.length ? { projectId: { in: projectIds } } : {}) } }),
      this.prisma.inventoryItem.findMany({ where: { organization: { id: orgId } }, include: { material: true, warehouse: true } }),
      this.getFinanceSummary(orgId, projectIds),
      this.getWorkforceSummary(orgId, projectIds),
    ]);

    return { type, projects, dailyReports, purchaseOrders, inventory, finance, workforce, generatedAt: new Date().toISOString() };
  }

  private async getFinanceSummary(orgId: string, projectIds?: string[]) {
    const [budgetItems, invoices, payments] = await Promise.all([
      this.prisma.budgetItem.findMany({ where: { organizationId: orgId, ...(projectIds?.length ? { projectId: { in: projectIds } } : {}) } }),
      this.prisma.invoice.findMany({ where: { organizationId: orgId, ...(projectIds?.length ? { projectId: { in: projectIds } } : {}) } }),
      this.prisma.payment.findMany({ where: { organizationId: orgId, ...(projectIds?.length ? { projectId: { in: projectIds } } : {}) } }),
    ]);
    return { budgetItems, invoices, payments };
  }

  private async getWorkforceSummary(orgId: string, projectIds?: string[]) {
    const projectFilter = projectIds?.length ? { id: { in: projectIds }, organizationId: orgId } : { organizationId: orgId };
    const workers = await this.prisma.worker.findMany({ where: projectFilter });
    return { workers, totalCount: workers.length };
  }

  // List generated reports history
  async getHistory(organizationId: string, options?: { page?: number; limit?: number }, includeFinancial = true) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;
    const where = { organizationId, ...(includeFinancial ? {} : { type: { not: 'FINANCIAL' } }) };

    const [data, total] = await Promise.all([
      this.prisma.generatedReport.findMany({
        where,
        include: { project: { select: { id: true, name: true } } },
        orderBy: { generatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.generatedReport.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // Get single report
  async getById(id: string, organizationId: string, includeFinancial = true) {
    return this.prisma.generatedReport.findFirst({
      where: { id, organizationId, ...(includeFinancial ? {} : { type: { not: 'FINANCIAL' } }) },
    });
  }

  // Delete report
  async delete(id: string, organizationId: string) {
    await this.prisma.generatedReport.deleteMany({ where: { id, organizationId } });
    return { message: 'Report deleted' };
  }

  // Schedule a report
  async createSchedule(input: {
    reportType: string;
    name: string;
    frequency: string;
    time?: string;
    timezone?: string;
    projects?: string[];
    recipients?: string[];
    emails?: string[];
    outputFormat?: string;
    includeAiSummary?: boolean;
    nextRunAt?: string;
  }, organizationId: string, userId: string) {
    // Get or create the report template
    let report = await this.prisma.report.findFirst({ where: { type: input.reportType, organizationId } });
    if (!report) {
      report = await this.prisma.report.create({
        data: { name: input.name, type: input.reportType, description: `Scheduled ${input.reportType} report`, projects: input.projects ?? [], organizationId, createdBy: userId },
      });
    }

    const nextRunAt = input.nextRunAt ? new Date(input.nextRunAt) : this.computeNextRun(input.frequency, input.time ?? '09:00');

    return this.prisma.reportSchedule.create({
      data: {
        reportId: report.id,
        reportType: input.reportType,
        name: input.name,
        frequency: input.frequency,
        time: input.time ?? '09:00',
        timezone: input.timezone ?? 'Asia/Kolkata',
        projects: input.projects ?? [],
        recipients: input.recipients ?? [],
        emails: input.emails ?? [],
        outputFormat: input.outputFormat ?? 'PDF',
        includeAiSummary: input.includeAiSummary ?? true,
        nextRunAt,
        organizationId,
        createdBy: userId,
      },
    });
  }

  // Update schedule
  async updateSchedule(id: string, input: Record<string, unknown>, organizationId: string) {
    const schedule = await this.prisma.reportSchedule.findFirst({ where: { id, organizationId } });
    if (!schedule) return null;
    const { reportType: _rt, ...rest } = input; // eslint-disable-line @typescript-eslint/no-unused-vars
    return this.prisma.reportSchedule.update({ where: { id }, data: rest as Record<string, unknown> });
  }

  private computeNextRun(frequency: string, time: string): Date {
    const now = new Date();
    const [h, m] = time.split(':').map(Number);
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) {
      switch (frequency) {
        case 'DAILY': next.setDate(next.getDate() + 1); break;
        case 'WEEKLY': next.setDate(next.getDate() + 7); break;
        case 'MONTHLY': next.setMonth(next.getMonth() + 1); break;
        default: next.setDate(next.getDate() + 1); break;
      }
    }
    return next;
  }

  // Get schedules
  async getSchedules(organizationId: string) {
    return this.prisma.reportSchedule.findMany({
      where: { organizationId },
      include: { report: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Delete schedule
  async deleteSchedule(id: string, organizationId: string) {
    await this.prisma.reportSchedule.deleteMany({ where: { id, organizationId } });
    return { message: 'Schedule deleted' };
  }

  // Toggle schedule
  async toggleSchedule(id: string, organizationId: string) {
    const schedule = await this.prisma.reportSchedule.findFirst({ where: { id, organizationId } });
    if (!schedule) return null;
    return this.prisma.reportSchedule.update({ where: { id }, data: { enabled: !schedule.enabled } });
  }
}