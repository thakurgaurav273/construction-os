import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { DailyReport, DailyReportStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { DailyReportDetailView } from './daily-report.mapper';
import { DailyReportsService, EDITABLE_STATUSES } from './daily-reports.service';
import { ApproveDailyReportDto, RejectDailyReportDto } from './dto/review-daily-report.dto';

interface ReportTransition {
  report: DailyReport;
  actorId: string;
  /** The statuses the report must still be in when the change is written. */
  from: DailyReportStatus[];
  status: DailyReportStatus;
  changes: Omit<Prisma.DailyReportUncheckedUpdateInput, 'status'>;
  activityTitle: string;
  activityDescription: string;
}

/**
 * Daily report lifecycle: DRAFT → SUBMITTED → APPROVED, or SUBMITTED → REJECTED → (edit) → SUBMITTED.
 * Reviews follow maker-checker: the author of a report can never approve or reject it.
 */
@Injectable()
export class DailyReportWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: DailyReportsService,
  ) {}

  async submit(
    projectId: string,
    reportId: string,
    organizationId: string,
    userId: string,
  ): Promise<DailyReportDetailView> {
    const report = await this.reports.findEditableReport(projectId, reportId, organizationId, userId);
    if (!report.workCompleted?.trim()) {
      throw new BadRequestException('Describe the work completed before submitting the report.');
    }

    await this.transition({
      report,
      actorId: userId,
      from: EDITABLE_STATUSES,
      status: 'SUBMITTED',
      changes: {
        submittedAt: new Date(),
        reviewedById: null,
        reviewedAt: null,
        reviewNote: null,
      },
      activityTitle: 'Daily report submitted',
      activityDescription: `Site report for ${formatReportDate(report.date)} was submitted for review.`,
    });
    return this.reports.findOne(projectId, reportId, organizationId);
  }

  async approve(
    projectId: string,
    reportId: string,
    organizationId: string,
    userId: string,
    dto: ApproveDailyReportDto,
  ): Promise<DailyReportDetailView> {
    const report = await this.findReviewableReport(projectId, reportId, organizationId, userId);

    await this.transition({
      report,
      actorId: userId,
      from: ['SUBMITTED'],
      status: 'APPROVED',
      changes: {
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNote: dto.note?.trim() || null,
      },
      activityTitle: 'Daily report approved',
      activityDescription: `Site report for ${formatReportDate(report.date)} was approved.`,
    });
    return this.reports.findOne(projectId, reportId, organizationId);
  }

  async reject(
    projectId: string,
    reportId: string,
    organizationId: string,
    userId: string,
    dto: RejectDailyReportDto,
  ): Promise<DailyReportDetailView> {
    const report = await this.findReviewableReport(projectId, reportId, organizationId, userId);

    await this.transition({
      report,
      actorId: userId,
      from: ['SUBMITTED'],
      status: 'REJECTED',
      changes: {
        reviewedById: userId,
        reviewedAt: new Date(),
        reviewNote: dto.note.trim(),
      },
      activityTitle: 'Daily report sent back',
      activityDescription: `Site report for ${formatReportDate(report.date)} needs changes: ${dto.note.trim()}`,
    });
    return this.reports.findOne(projectId, reportId, organizationId);
  }

  private async findReviewableReport(
    projectId: string,
    reportId: string,
    organizationId: string,
    userId: string,
  ): Promise<DailyReport> {
    const report = await this.prisma.dailyReport.findFirst({
      where: { id: reportId, projectId, organizationId },
    });
    if (!report) throw new NotFoundException('Daily report not found.');
    if (report.status !== 'SUBMITTED') {
      throw new ConflictException('Only submitted reports can be reviewed.');
    }
    if (report.submittedById === userId) {
      throw new ForbiddenException("You can't review a report you wrote.");
    }
    return report;
  }

  private async transition(transition: ReportTransition): Promise<void> {
    const { report, actorId, from, status, changes, activityTitle, activityDescription } = transition;

    await this.prisma.$transaction(async (tx) => {
      // Matching on the expected status stops two reviewers (or a review and a resubmit) both winning.
      const { count } = await tx.dailyReport.updateMany({
        where: { id: report.id, status: { in: from } },
        data: { ...changes, status },
      });
      if (count === 0) {
        throw new ConflictException('This report was just updated by someone else. Refresh and try again.');
      }
      await tx.activity.create({
        data: {
          type: 'report',
          title: activityTitle,
          description: activityDescription,
          entityType: 'daily_report',
          entityId: report.id,
          metadata: { reportDate: formatReportDate(report.date), status },
          actorId,
          projectId: report.projectId,
          organizationId: report.organizationId,
        },
      });
    });
  }
}

function formatReportDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
