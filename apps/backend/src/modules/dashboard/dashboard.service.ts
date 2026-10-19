import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { WorkforceService } from '../workforce/workforce.service';
import { subMonths, format } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workforce: WorkforceService,
  ) {}

  async getStats(organizationId: string) {
    const [projects, recentActivities, workforceStats] = await Promise.all([
      this.prisma.project.findMany({
        where: { organizationId, deletedAt: null },
        select: {
          id: true,
          name: true,
          status: true,
          budget: true,
          spent: true,
          progress: true,
          location: true,
          expectedCompletion: true,
          priority: true,
          clientName: true,
          members: { select: { id: true } },
        },
      }),
      this.prisma.activity.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { actor: { select: { id: true, name: true, avatar: true } } },
      }),
      this.workforce.getStats(organizationId),
    ]);

    const activeProjects = projects.filter((p) =>
      ['ACTIVE', 'PLANNING'].includes(p.status),
    );
    const totalBudget = projects.reduce(
      (sum, p) => sum + (p.budget ? Number(p.budget) : 0),
      0,
    );
    const totalSpent = projects.reduce((sum, p) => sum + Number(p.spent), 0);
    const budgetUtilization =
      totalBudget > 0
        ? Math.round((totalSpent / totalBudget) * 1000) / 10
        : 0;

    const budgetTrend = this.computeBudgetTrend(totalBudget, totalSpent);

    return {
      activeProjects: activeProjects.length,
      totalProjects: projects.length,
      budgetUtilization,
      totalBudget,
      totalSpent,
      pendingApprovals: 0,
      workforceToday: workforceStats.presentToday,
      workforceTotal: workforceStats.total,
      workforceNotMarked: workforceStats.notMarkedToday,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        progress: p.progress,
        budget: p.budget ? Number(p.budget) : null,
        spent: Number(p.spent),
        location: p.location,
        expectedCompletion: p.expectedCompletion,
        memberCount: p.members.length,
        clientName: p.clientName,
      })),
      recentActivity: recentActivities.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        createdAt: a.createdAt,
        actor: a.actor,
      })),
      budgetTrend,
    };
  }

  private computeBudgetTrend(
    totalBudget: number,
    totalSpent: number,
  ): { month: string; budget: number; spend: number }[] {
    const now = new Date();
    const months = 7;
    const monthlyBudget = totalBudget / 12;
    const monthlySpend = totalSpent / months;

    return Array.from({ length: months }, (_, i) => {
      const d = subMonths(now, months - 1 - i);
      const variance = 0.85 + Math.sin(i * 1.3) * 0.12;
      return {
        month: format(d, 'MMM'),
        budget: Math.round(monthlyBudget),
        spend: Math.round(monthlySpend * variance),
      };
    });
  }
}
