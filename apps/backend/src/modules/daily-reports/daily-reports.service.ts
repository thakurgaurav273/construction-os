import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { DailyReport, DailyReportStatus, Prisma } from '@prisma/client';
import { assertProjectOpen, findOpenProject } from '../projects/project-guards';
import { PrismaService } from '../../database/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { ALLOWED_ATTACHMENT_MIME_TYPES } from './daily-reports.constants';
import {
  DAILY_REPORT_DETAIL_INCLUDE, DAILY_REPORT_LIST_INCLUDE, DailyReportDetailView, DailyReportView,
  toDailyReportContentData, toDailyReportDetailView, toDailyReportView,
} from './daily-report.mapper';
import { CreateDailyReportDto } from './dto/create-daily-report.dto';
import { DailyReportQueryDto } from './dto/daily-report-query.dto';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';

export const EDITABLE_STATUSES: DailyReportStatus[] = ['DRAFT', 'REJECTED'];
const SORTABLE_FIELDS = ['date', 'createdAt', 'submittedAt'] as const;

export interface PaginatedDailyReports {
  items: DailyReportView[];
  total: number;
  page: number;
  limit: number;
}

export type DailyReportSummary = Record<DailyReportStatus, number> & { total: number };

@Injectable()
export class DailyReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
  ) {}

  async findAllForProject(projectId: string, organizationId: string): Promise<DailyReportView[]> {
    const reports = await this.prisma.dailyReport.findMany({
      where: { projectId, organizationId },
      include: DAILY_REPORT_LIST_INCLUDE,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return reports.map(toDailyReportView);
  }

  async findAllForOrganization(
    organizationId: string,
    query: DailyReportQueryDto,
  ): Promise<PaginatedDailyReports> {
    const where: Prisma.DailyReportWhereInput = {
      organizationId,
      project: { deletedAt: null },
      projectId: query.projectId,
      status: query.status,
    };
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { workCompleted: { contains: search, mode: 'insensitive' } },
        { project: { name: { contains: search, mode: 'insensitive' } } },
        { submittedBy: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const sortField = SORTABLE_FIELDS.find((field) => field === query.sort) ?? 'date';
    const sortOrder = query.order === 'asc' ? 'asc' : 'desc';

    const [reports, total] = await this.prisma.$transaction([
      this.prisma.dailyReport.findMany({
        where,
        include: DAILY_REPORT_LIST_INCLUDE,
        orderBy: [{ [sortField]: sortOrder }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.dailyReport.count({ where }),
    ]);

    return { items: reports.map(toDailyReportView), total, page: query.page, limit: query.limit };
  }

  async getSummary(organizationId: string): Promise<DailyReportSummary> {
    const groups = await this.prisma.dailyReport.groupBy({
      by: ['status'],
      where: { organizationId, project: { deletedAt: null } },
      _count: { _all: true },
    });

    const summary: DailyReportSummary = { DRAFT: 0, SUBMITTED: 0, APPROVED: 0, REJECTED: 0, total: 0 };
    for (const group of groups) {
      summary[group.status] = group._count._all;
      summary.total += group._count._all;
    }
    return summary;
  }

  async findOne(projectId: string, reportId: string, organizationId: string): Promise<DailyReportDetailView> {
    const report = await this.prisma.dailyReport.findFirst({
      where: { id: reportId, projectId, organizationId },
      include: DAILY_REPORT_DETAIL_INCLUDE,
    });
    if (!report) throw new NotFoundException('Daily report not found.');
    return toDailyReportDetailView(report);
  }

  async create(
    projectId: string,
    organizationId: string,
    userId: string,
    dto: CreateDailyReportDto,
  ): Promise<DailyReportDetailView> {
    await findOpenProject(this.prisma, projectId, organizationId, 'add daily reports to it');

    const report = await this.prisma.dailyReport.create({
      data: {
        ...toDailyReportContentData(dto),
        date: new Date(dto.date),
        projectId,
        organizationId,
        submittedById: userId,
        status: 'DRAFT',
      },
    });
    return this.findOne(projectId, report.id, organizationId);
  }

  async update(
    projectId: string,
    reportId: string,
    organizationId: string,
    userId: string,
    dto: UpdateDailyReportDto,
  ): Promise<DailyReportDetailView> {
    await this.findEditableReport(projectId, reportId, organizationId, userId);
    // Guarding on status inside the write keeps an edit from landing after a concurrent submit.
    const { count } = await this.prisma.dailyReport.updateMany({
      where: { id: reportId, status: { in: EDITABLE_STATUSES } },
      data: toDailyReportContentData(dto),
    });
    if (count === 0) throw new ConflictException('Submitted reports are locked and can no longer be edited.');
    return this.findOne(projectId, reportId, organizationId);
  }

  async addAttachment(
    projectId: string,
    reportId: string,
    organizationId: string,
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<DailyReportDetailView> {
    if (!file) throw new BadRequestException('Select a file to upload.');
    if (!ALLOWED_ATTACHMENT_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Attach photos (JPG, PNG, WEBP, HEIC) or PDF files only.');
    }

    await this.findEditableReport(projectId, reportId, organizationId, userId);
    await this.documents.upload(projectId, organizationId, userId, file, { dailyReportId: reportId });
    return this.findOne(projectId, reportId, organizationId);
  }

  async removeAttachment(
    projectId: string,
    reportId: string,
    documentId: string,
    organizationId: string,
    userId: string,
  ): Promise<DailyReportDetailView> {
    await this.findEditableReport(projectId, reportId, organizationId, userId);

    const attachment = await this.prisma.document.findFirst({
      where: { id: documentId, dailyReportId: reportId, organizationId },
      select: { id: true },
    });
    if (!attachment) throw new NotFoundException('Attachment not found.');

    await this.documents.remove(attachment.id, organizationId);
    return this.findOne(projectId, reportId, organizationId);
  }

  /**
   * Only the author may change a report, and only while it is a draft or has been sent back.
   * Submitted and approved reports are the site's record of the day and stay locked.
   */
  async findEditableReport(
    projectId: string,
    reportId: string,
    organizationId: string,
    userId: string,
  ): Promise<DailyReport> {
    const report = await this.prisma.dailyReport.findFirst({
      where: { id: reportId, projectId, organizationId },
      include: { project: { select: { status: true } } },
    });
    if (!report) throw new NotFoundException('Daily report not found.');
    assertProjectOpen(report.project, 'change its daily reports');
    if (report.submittedById !== userId) {
      throw new ForbiddenException('Only the author can change this report.');
    }
    if (!EDITABLE_STATUSES.includes(report.status)) {
      throw new ConflictException('Submitted reports are locked and can no longer be edited.');
    }
    return report;
  }

}
