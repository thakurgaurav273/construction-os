import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Permission } from '@sitepilot/types';
import { subDays } from 'date-fns';
import { PrismaService } from '../../database/prisma.service';
import { projectSpend } from '../finance/project-spend';

/** Upper bound on the data block sent with every prompt (~4k tokens), so costs stay predictable. */
const MAX_CONTEXT_CHARS = 16_000;

const num = (value: Prisma.Decimal | number | null | undefined): number => (value == null ? 0 : Number(value));
const day = (date: Date | null | undefined): string => (date ? date.toISOString().slice(0, 10) : 'n/a');
const clip = (text: string | null | undefined, length: number): string => {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  return clean.length > length ? `${clean.slice(0, length)}…` : clean;
};
const inr = (value: number): string => `₹${Math.round(value).toLocaleString('en-IN')}`;

function issuesText(issues: Prisma.JsonValue): string {
  if (!Array.isArray(issues)) return '';
  return issues
    .map((issue) => (issue && typeof issue === 'object' && 'description' in issue ? String((issue as { description: unknown }).description) : ''))
    .filter(Boolean)
    .join('; ');
}

/** The areas whose data can go into an AI prompt; each section is left out when the reader can't view it (ADR-050). */
export const AI_CONTEXT_AREAS: Permission[] = [
  'project.view', 'finance.view', 'procurement.view', 'inventory.view', 'material.view', 'dailyReport.view', 'workforce.view',
];

/** Runs the query only when the area is visible, so hidden data is never read into a prompt. */
function ifAllowed<T>(allowed: boolean, query: () => Promise<T>, empty: T): Promise<T> {
  return allowed ? query() : Promise.resolve(empty);
}

/**
 * Builds the factual data block the model answers from. Everything is scoped to the caller's organization
 * and to the areas they can view, and read fresh, so answers reflect the live state of the business.
 */
@Injectable()
export class AiContextService {
  constructor(private readonly prisma: PrismaService) {}

  async project(projectId: string, organizationId: string, permissions: readonly Permission[]): Promise<{ name: string; context: string }> {
    const can = (permission: Permission): boolean => permissions.includes(permission);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
      include: { _count: { select: { members: true, workers: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');

    const weekAgo = subDays(new Date(), 7);
    const [spend, reports, orders, usages, attendance, activities] = await Promise.all([
      ifAllowed(can('finance.view'), () => projectSpend(this.prisma, organizationId, [projectId]), new Map<string, number>()),
      ifAllowed(can('dailyReport.view'), () => this.prisma.dailyReport.findMany({
        where: { projectId, organizationId },
        orderBy: { date: 'desc' },
        take: 10,
        select: { date: true, status: true, weather: true, labourCount: true, overallProgress: true, workCompleted: true, remarks: true, issues: true },
      }), []),
      ifAllowed(can('procurement.view'), () => this.prisma.purchaseOrder.findMany({
        where: { projectId, organizationId, status: { in: ['PENDING', 'APPROVED', 'CHANGES_REQUESTED'] } },
        orderBy: { expectedDelivery: 'asc' },
        take: 15,
        select: { poNumber: true, status: true, amount: true, category: true, expectedDelivery: true, vendor: { select: { name: true } } },
      }), []),
      ifAllowed(can('material.view'), () => this.prisma.materialProjectUsage.findMany({
        where: { projectId, organizationId },
        take: 20,
        orderBy: { consumed: 'desc' },
        select: { allocated: true, consumed: true, material: { select: { name: true, unit: true } } },
      }), []),
      ifAllowed(can('workforce.view'), () => this.prisma.attendance.groupBy({
        by: ['status'],
        where: { projectId, organizationId, date: { gte: weekAgo } },
        _count: { _all: true },
      }), []),
      // The activity feed mixes every area, including finance, so it needs full operational access.
      ifAllowed(AI_CONTEXT_AREAS.every(can), () => this.prisma.activity.findMany({
        where: { projectId, organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { title: true, description: true, createdAt: true },
      }), []),
    ]);

    const hidden = 'not available to this user';
    const lines = [
      `PROJECT: ${project.name} (${project.code})`,
      `Status: ${project.status} | Priority: ${project.priority} | Progress: ${project.progress}%`,
      `Client: ${project.clientName ?? 'n/a'} | Location: ${project.location ?? 'n/a'}`,
      `Dates: start ${day(project.startDate)}, expected completion ${day(project.expectedCompletion)}, today ${day(new Date())}`,
      can('finance.view') ? `Budget: ${project.budget ? inr(num(project.budget)) : 'not set'} | Spent: ${inr(spend.get(projectId) ?? 0)}` : `Budget and spend: ${hidden}`,
      `Team members: ${project._count.members}${can('workforce.view') ? ` | Workers assigned: ${project._count.workers}` : ''}`,
      '',
      'ATTENDANCE (last 7 days): ' + (!can('workforce.view') ? hidden : attendance.length ? attendance.map((row) => `${row.status} ${row._count._all}`).join(', ') : 'no records'),
      '',
      'RECENT DAILY REPORTS (newest first):',
      ...(!can('dailyReport.view') ? [`- ${hidden}`] : reports.length ? reports.map((report) => `- ${day(report.date)} [${report.status}] weather ${report.weather ?? 'n/a'}, labour ${report.labourCount}`
        + `${report.overallProgress != null ? `, progress ${report.overallProgress}%` : ''}. Work: ${clip(report.workCompleted, 300) || 'n/a'}`
        + `${issuesText(report.issues) ? `. Issues: ${clip(issuesText(report.issues), 200)}` : ''}${report.remarks ? `. Remarks: ${clip(report.remarks, 150)}` : ''}`) : ['- none']),
      '',
      'OPEN PURCHASE ORDERS:',
      ...(!can('procurement.view') ? [`- ${hidden}`] : orders.length ? orders.map((order) => `- ${order.poNumber} [${order.status}] ${order.category}, ${inr(num(order.amount))}, vendor ${order.vendor?.name ?? 'n/a'}, expected ${day(order.expectedDelivery)}`) : ['- none']),
      '',
      'MATERIAL CONSUMPTION vs PLAN:',
      ...(!can('material.view') ? [`- ${hidden}`] : usages.length ? usages.map((usage) => `- ${usage.material.name}: issued ${num(usage.consumed)} ${usage.material.unit}`
        + `${num(usage.allocated) > 0 ? ` of planned ${num(usage.allocated)}` : ' (no plan set)'}`) : ['- none']),
      '',
      'RECENT ACTIVITY:',
      ...(!AI_CONTEXT_AREAS.every(can) ? [`- ${hidden}`] : activities.length ? activities.map((activity) => `- ${day(activity.createdAt)} ${activity.title}: ${clip(activity.description, 150)}`) : ['- none']),
    ];
    return { name: project.name, context: lines.join('\n').slice(0, MAX_CONTEXT_CHARS) };
  }

  async organization(organizationId: string, permissions: readonly Permission[]): Promise<string> {
    const can = (permission: Permission): boolean => permissions.includes(permission);
    const now = new Date();
    const [projects, spend, pendingOrders, overdueOrders, pendingInvoices, pendingPayments, pendingTransfers, submittedReports, stock, attendanceToday] = await Promise.all([
      ifAllowed(can('project.view'), () => this.prisma.project.findMany({
        where: { organizationId, deletedAt: null, status: { not: 'ARCHIVED' } },
        orderBy: { name: 'asc' },
        take: 40,
        select: { id: true, name: true, code: true, status: true, priority: true, progress: true, budget: true, expectedCompletion: true },
      }), []),
      ifAllowed(can('finance.view'), () => projectSpend(this.prisma, organizationId), new Map<string, number>()),
      ifAllowed(can('procurement.view'), () => this.prisma.purchaseOrder.count({ where: { organizationId, status: 'PENDING' } }), 0),
      ifAllowed(can('procurement.view'), () => this.prisma.purchaseOrder.findMany({
        where: { organizationId, status: 'APPROVED', expectedDelivery: { lt: now } },
        take: 10,
        orderBy: { expectedDelivery: 'asc' },
        select: { poNumber: true, expectedDelivery: true, project: { select: { name: true } }, vendor: { select: { name: true } } },
      }), []),
      ifAllowed(can('finance.view'), () => this.prisma.invoice.count({ where: { organizationId, status: 'PENDING_APPROVAL' } }), 0),
      ifAllowed(can('finance.view'), () => this.prisma.payment.count({ where: { organizationId, status: 'PENDING' } }), 0),
      ifAllowed(can('inventory.view'), () => this.prisma.stockTransfer.count({ where: { organizationId, status: 'PENDING' } }), 0),
      ifAllowed(can('dailyReport.view'), () => this.prisma.dailyReport.count({ where: { organizationId, status: 'SUBMITTED' } }), 0),
      ifAllowed(can('inventory.view'), () => this.prisma.inventoryItem.findMany({
        where: { organizationId, warehouse: { deletedAt: null } },
        select: { quantity: true, reserved: true, reorderLevel: true, material: { select: { name: true, unit: true } }, warehouse: { select: { name: true } } },
      }), []),
      ifAllowed(can('workforce.view'), () => this.prisma.attendance.groupBy({
        by: ['status'],
        where: { organizationId, date: { gte: new Date(now.toISOString().slice(0, 10)) } },
        _count: { _all: true },
      }), []),
    ]);
    const lowStock = stock
      .filter((item) => num(item.reorderLevel) > 0 && num(item.quantity) - num(item.reserved) <= num(item.reorderLevel))
      .slice(0, 12);

    const hidden = 'not available to this user';
    const waiting = [
      can('procurement.view') && `${pendingOrders} purchase orders`,
      can('finance.view') && `${pendingInvoices} bills, ${pendingPayments} payments`,
      can('inventory.view') && `${pendingTransfers} stock transfers`,
      can('dailyReport.view') && `${submittedReports} daily reports`,
    ].filter(Boolean).join(', ');
    const lines = [
      `TODAY: ${day(now)}`,
      '',
      'PROJECTS:',
      ...(!can('project.view') ? [`- ${hidden}`] : projects.length ? projects.map((project) => {
        const budget = num(project.budget);
        const spent = spend.get(project.id) ?? 0;
        const usedPct = budget > 0 ? ` (${Math.round((spent / budget) * 100)}% of budget)` : '';
        const money = can('finance.view') ? `spent ${inr(spent)}${budget > 0 ? ` of ${inr(budget)}` : ''}${usedPct}, ` : '';
        return `- ${project.name} (${project.code}) [${project.status}, ${project.priority}] progress ${project.progress}%, ${money}due ${day(project.expectedCompletion)}`;
      }) : ['- none']),
      '',
      `WAITING FOR APPROVAL: ${waiting || hidden}`,
      '',
      'APPROVED ORDERS PAST THEIR DELIVERY DATE:',
      ...(!can('procurement.view') ? [`- ${hidden}`] : overdueOrders.length ? overdueOrders.map((order) => `- ${order.poNumber} for ${order.project?.name ?? 'no project'} from ${order.vendor?.name ?? 'n/a'}, expected ${day(order.expectedDelivery)}`) : ['- none']),
      '',
      'STOCK AT OR BELOW REORDER LEVEL:',
      ...(!can('inventory.view') ? [`- ${hidden}`] : lowStock.length ? lowStock.map((item) => `- ${item.material.name} at ${item.warehouse.name}: ${num(item.quantity) - num(item.reserved)} ${item.material.unit} available, reorder at ${num(item.reorderLevel)}`) : ['- none']),
      '',
      'ATTENDANCE TODAY: ' + (!can('workforce.view') ? hidden : attendanceToday.length ? attendanceToday.map((row) => `${row.status} ${row._count._all}`).join(', ') : 'not marked yet'),
    ];
    return lines.join('\n').slice(0, MAX_CONTEXT_CHARS);
  }

  async dailyReport(projectId: string, reportId: string, organizationId: string): Promise<{ context: string }> {
    const report = await this.prisma.dailyReport.findFirst({
      where: { id: reportId, projectId, organizationId },
      include: { project: { select: { name: true } }, submittedBy: { select: { name: true } } },
    });
    if (!report) throw new NotFoundException('Daily report not found');
    const json = (value: Prisma.JsonValue): string => (value == null ? 'none' : clip(JSON.stringify(value), 1500));
    return {
      context: [
        `PROJECT: ${report.project.name}`,
        `DATE: ${day(report.date)} | STATUS: ${report.status} | AUTHOR: ${report.submittedBy.name}`,
        `WEATHER: ${report.weather ?? 'n/a'} | LABOUR: ${report.labourCount} | PROGRESS: ${report.overallProgress ?? 'n/a'}%`,
        `WORK COMPLETED: ${clip(report.workCompleted, 3000) || 'n/a'}`,
        `REMARKS: ${clip(report.remarks, 1000) || 'none'}`,
        `LABOUR DETAILS: ${json(report.labourDetails)}`,
        `MATERIALS CONSUMED: ${json(report.materialsConsumed)}`,
        `EQUIPMENT: ${json(report.equipmentUsed)}`,
        `ISSUES: ${json(report.issues)}`,
      ].join('\n'),
    };
  }
}
