import { Injectable } from '@nestjs/common';
import type { Permission } from '@sitepilot/types';
import { PrismaService } from '../../database/prisma.service';
import { WorkforceService } from '../workforce/workforce.service';
import { PendingApprovals, PendingApprovalsService } from './pending-approvals.service';
import { SpendTrendPoint, spendTrend } from './spend-trend';

const LIVE_STATUSES = ['ACTIVE', 'PLANNING'];
const NEW_PROJECT_WINDOW_DAYS = 30;

export interface DashboardMember {
  id: string;
  organizationId: string;
  permissions: Permission[];
}

export interface DashboardProject {
  id: string;
  name: string;
  status: string;
  priority: string;
  progress: number;
  budget: number | null;
  spent: number;
  location: string | null;
  expectedCompletion: Date | null;
  memberCount: number;
  clientName: string | null;
}

export interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  createdAt: Date;
  actor: { id: string; name: string; avatar: string | null };
}

export interface DashboardStats {
  activeProjects: number;
  totalProjects: number;
  newProjects: number;
  budgetUtilization: number;
  totalBudget: number;
  totalSpent: number;
  approvals: PendingApprovals;
  workforceToday: number;
  workforceTotal: number;
  workforceNotMarked: number;
  projects: DashboardProject[];
  recentActivity: DashboardActivity[];
  /** Null for members without finance access: payments are finance data. */
  spendTrend: SpendTrendPoint[] | null;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workforce: WorkforceService,
    private readonly approvals: PendingApprovalsService,
  ) {}

  async getStats(member: DashboardMember): Promise<DashboardStats> {
    const { organizationId } = member;
    const canSeeFinance = member.permissions.includes('finance.view');
    const today = new Date();
    const [projects, recentActivities, workforceStats, approvals, paidPayments] = await Promise.all([
      this.prisma.project.findMany({
        where: { organizationId, deletedAt: null },
        select: {
          id: true, name: true, status: true, budget: true, spent: true, progress: true, location: true, startDate: true,
          expectedCompletion: true, priority: true, clientName: true, createdAt: true, members: { select: { id: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.activity.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { actor: { select: { id: true, name: true, avatar: true } } },
      }),
      this.workforce.getStats(organizationId),
      this.approvals.forMember(member),
      canSeeFinance
        ? this.prisma.payment.findMany({ where: { organizationId, status: 'PAID' }, select: { amount: true, paidDate: true } })
        : Promise.resolve(null),
    ]);

    const liveProjects = projects.filter((project) => LIVE_STATUSES.includes(project.status));
    const newSince = new Date(today.getTime() - NEW_PROJECT_WINDOW_DAYS * 24 * 3600 * 1000);
    const totalBudget = projects.reduce((sum, project) => sum + (project.budget ? Number(project.budget) : 0), 0);
    const totalSpent = projects.reduce((sum, project) => sum + Number(project.spent), 0);

    return {
      activeProjects: liveProjects.length,
      totalProjects: projects.length,
      newProjects: projects.filter((project) => project.createdAt >= newSince).length,
      budgetUtilization: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 1000) / 10 : 0,
      totalBudget,
      totalSpent,
      approvals,
      workforceToday: workforceStats.presentToday,
      workforceTotal: workforceStats.total,
      workforceNotMarked: workforceStats.notMarkedToday,
      projects: liveProjects.slice(0, 5).map((project) => ({
        id: project.id,
        name: project.name,
        status: project.status,
        priority: project.priority,
        progress: project.progress,
        budget: project.budget ? Number(project.budget) : null,
        spent: Number(project.spent),
        location: project.location,
        expectedCompletion: project.expectedCompletion,
        memberCount: project.members.length,
        clientName: project.clientName,
      })),
      recentActivity: recentActivities.map((activity) => ({
        id: activity.id,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        createdAt: activity.createdAt,
        actor: activity.actor,
      })),
      spendTrend: paidPayments ? spendTrend(projects, paidPayments, today) : null,
    };
  }
}
