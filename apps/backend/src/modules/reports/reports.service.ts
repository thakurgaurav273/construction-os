import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const num = (d: any): number => d == null ? 0 : Number(d);

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
    const projectFilter = projectIds?.length ? { id: { in: projectIds } } : { organizationId: orgId };
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
  async getHistory(organizationId: string, options?: { page?: number; limit?: number }) {
    const page = options?.page ?? 1;
    const limit = options?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.generatedReport.findMany({
        where: { organizationId },
        include: { project: { select: { id: true, name: true } } },
        orderBy: { generatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.generatedReport.count({ where: { organizationId } }),
    ]);

    return { data, total, page, limit };
  }

  // Get single report
  async getById(id: string, organizationId: string) {
    return this.prisma.generatedReport.findFirst({ where: { id, organizationId } });
  }

  // Delete report
  async delete(id: string, organizationId: string) {
    await this.prisma.generatedReport.deleteMany({ where: { id, organizationId } });
    return { message: 'Report deleted' };
  }

  // Schedule a report
  async createSchedule(input: { reportId: string; name: string; frequency: string; projects?: string[]; recipients: string[]; nextRunAt: Date }, organizationId: string, userId: string) {
    return this.prisma.reportSchedule.create({
      data: {
        reportId: input.reportId,
        name: input.name,
        frequency: input.frequency,
        projects: input.projects ?? [],
        recipients: input.recipients,
        nextRunAt: input.nextRunAt,
        organizationId,
        createdBy: userId,
      },
    });
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