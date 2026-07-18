import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';

@Injectable()
export class DailyReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string, organizationId: string) {
    const reports = await this.prisma.dailyReport.findMany({
      where: { projectId, organizationId },
      include: { submittedBy: { select: { id: true, name: true, avatar: true } } },
      orderBy: { date: 'desc' },
    });
    return reports.map((r) => this.map(r));
  }

  async findOne(projectId: string, reportId: string, organizationId: string) {
    const r = await this.prisma.dailyReport.findFirst({
      where: { id: reportId, projectId, organizationId },
      include: {
        submittedBy: { select: { id: true, name: true, avatar: true } },
        documents: true,
      },
    });
    if (!r) throw new NotFoundException('Daily report not found');
    return this.map(r);
  }

  async create(projectId: string, organizationId: string, userId: string, dto: CreateDailyReportDto) {
    const report = await this.prisma.dailyReport.create({
      data: {
        projectId,
        organizationId,
        submittedById: userId,
        date: dto.date ? new Date(dto.date) : new Date(),
        weather: dto.weather,
        overallProgress: dto.overallProgress,
        workCompleted: dto.workCompleted,
        remarks: dto.remarks,
        labourCount: dto.labourCount ?? 0,
        status: dto.status ?? 'DRAFT',
        labourDetails: (dto.labourDetails ?? {}) as any,
        materialsConsumed: (dto.materialsConsumed ?? []) as any,
        equipmentUsed: (dto.equipmentUsed ?? []) as any,
        issues: (dto.issues ?? []) as any,
      },
      include: { submittedBy: { select: { id: true, name: true, avatar: true } } },
    });
    return this.map(report);
  }

  private map(r: any) {
    return {
      id: r.id,
      projectId: r.projectId,
      date: r.date,
      weather: r.weather,
      overallProgress: r.overallProgress,
      workCompleted: r.workCompleted,
      remarks: r.remarks,
      labourCount: r.labourCount,
      status: r.status,
      aiSummary: r.aiSummary,
      labourDetails: r.labourDetails,
      materialsConsumed: r.materialsConsumed,
      equipmentUsed: r.equipmentUsed,
      issues: r.issues,
      submittedBy: r.submittedBy,
      documents: r.documents ?? [],
      createdAt: r.createdAt,
    };
  }
}
