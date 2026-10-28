import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, ReportSchedule } from '@prisma/client';
import { StorageService } from '../../common/storage/storage.service';
import { PrismaService } from '../../database/prisma.service';
import { CreateScheduleDto, GenerateReportDto, ReportDownloadQueryDto, UpdateScheduleDto } from './dto/report.dto';
import { ReportGenerationService } from './report-generation.service';
import { ReportSchedulerService } from './report-scheduler.service';
import {
  REPORT_LIST_SELECT, ReportDetailView, ReportScheduleView, ReportView, toReportDetailView, toReportView, toScheduleView,
} from './reports.mapper';
import { DEFAULT_REPORT_DAYS, MAX_REPORT_DAYS, REPORT_TITLES, REPORT_TYPES, ReportTypeKey } from './reports.constants';
import { firstRunAt, isValidTimeZone } from './schedule-timing';

const DAY_MS = 24 * 3600 * 1000;
const DEFAULT_TIME = '09:00';
const DEFAULT_TIMEZONE = 'Asia/Kolkata';
/** Links from the page are used straight away. */
const DOWNLOAD_LINK_TTL_SECONDS = 5 * 60;

const REPORT_DESCRIPTIONS: Record<string, { description: string; icon: string }> = {
  EXECUTIVE: { description: 'Portfolio health, spend, attendance and the risks that need a decision.', icon: 'LayoutDashboard' },
  COST: { description: 'Budget allocation, commitments and spend by category and project.', icon: 'PieChart' },
  WORKFORCE: { description: 'Headcount by trade, attendance, overtime and compliance gaps.', icon: 'Users' },
  SCHEDULE: { description: 'Progress against each project’s planned timeline, and site reporting.', icon: 'BarChart3' },
  PROCUREMENT: { description: 'Purchase orders, vendor spend and delivery performance.', icon: 'ShoppingCart' },
  INVENTORY: { description: 'Stock on hand and its value, reorder needs and movements.', icon: 'Package' },
  FINANCIAL: { description: 'Payables, receivables, cash flow and budget use.', icon: 'Wallet' },
  SAFETY: { description: 'Site issues from daily reports, PPE compliance and certifications.', icon: 'ShieldAlert' },
};

export interface ReportTemplateView {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface ReportPage {
  items: ReportView[];
  total: number;
  page: number;
  limit: number;
}

/** Financial reports are hidden from members without finance access everywhere they could be read. */
const visibleTypes = (visible: readonly ReportTypeKey[]): Prisma.GeneratedReportWhereInput => ({ type: { in: [...visible] } });

function startOfUtcDay(value: string): Date {
  const date = new Date(value);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Reports cover whole days: from the start of the first to the end of the last. */
export function reportPeriod(periodFrom: string | undefined, periodTo: string | undefined, now: Date): { from: Date; to: Date } {
  const to = periodTo ? new Date(startOfUtcDay(periodTo).getTime() + DAY_MS - 1) : now;
  const from = periodFrom ? startOfUtcDay(periodFrom) : startOfUtcDay(new Date(to.getTime() - (DEFAULT_REPORT_DAYS - 1) * DAY_MS).toISOString());
  if (from > to) throw new BadRequestException('The start date must be on or before the end date.');
  if (to.getTime() - from.getTime() > MAX_REPORT_DAYS * DAY_MS) throw new BadRequestException(`A report can cover at most ${MAX_REPORT_DAYS} days.`);
  return { from, to };
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly generation: ReportGenerationService,
    private readonly scheduler: ReportSchedulerService,
  ) {}

  getTemplates(visible: readonly ReportTypeKey[]): ReportTemplateView[] {
    return REPORT_TYPES
      .filter((type) => visible.includes(type))
      .map((type) => ({ id: type, name: REPORT_TITLES[type], ...REPORT_DESCRIPTIONS[type] }));
  }

  /** Creates the pending report and queues it; the client polls until its files are ready. */
  async generate(dto: GenerateReportDto, organizationId: string, userId: string): Promise<ReportView> {
    const projectIds = await this.assertProjectsInOrganization(organizationId, dto.projectIds);
    const period = reportPeriod(dto.periodFrom, dto.periodTo, new Date());
    const report = await this.generation.queue({
      organizationId,
      userId,
      type: dto.type,
      name: dto.name.trim(),
      format: dto.format ?? 'PDF',
      projectIds,
      from: period.from,
      to: period.to,
      includeAiSummary: dto.includeAiSummary ?? false,
    });
    return toReportView(report);
  }

  async getHistory(organizationId: string, options: { page?: number; limit?: number }, visible: readonly ReportTypeKey[]): Promise<ReportPage> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const where: Prisma.GeneratedReportWhereInput = { organizationId, ...visibleTypes(visible) };
    const [reports, total] = await Promise.all([
      this.prisma.generatedReport.findMany({ where, select: REPORT_LIST_SELECT, orderBy: { generatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.generatedReport.count({ where }),
    ]);
    return { items: reports.map(toReportView), total, page, limit };
  }

  async getById(id: string, organizationId: string, visible: readonly ReportTypeKey[]): Promise<ReportDetailView> {
    const report = await this.prisma.generatedReport.findFirst({ where: { id, organizationId, ...visibleTypes(visible) } });
    if (!report) throw new NotFoundException('Report not found.');
    return toReportDetailView(report);
  }

  async downloadLink(id: string, query: ReportDownloadQueryDto, organizationId: string, visible: readonly ReportTypeKey[]): Promise<{ url: string; fileName: string }> {
    const report = await this.prisma.generatedReport.findFirst({
      where: { id, organizationId, ...visibleTypes(visible) },
      select: { status: true, pdfKey: true, excelKey: true },
    });
    if (!report) throw new NotFoundException('Report not found.');
    if (report.status !== 'COMPLETED') throw new ConflictException('This report is still being generated.');
    const key = query.format === 'pdf' ? report.pdfKey : report.excelKey;
    if (!key) throw new NotFoundException(`This report wasn’t generated as ${query.format === 'pdf' ? 'a PDF' : 'an Excel file'}.`);
    const fileName = key.slice(key.lastIndexOf('/') + 1);
    return { url: await this.storage.getSignedDownloadUrl(key, DOWNLOAD_LINK_TTL_SECONDS, fileName), fileName };
  }

  async delete(id: string, organizationId: string, visible: readonly ReportTypeKey[]): Promise<{ id: string }> {
    const report = await this.prisma.generatedReport.findFirst({
      where: { id, organizationId, ...visibleTypes(visible) },
      select: { id: true, pdfKey: true, excelKey: true },
    });
    if (!report) throw new NotFoundException('Report not found.');
    await this.prisma.generatedReport.delete({ where: { id } });
    for (const key of [report.pdfKey, report.excelKey]) {
      if (key) await this.storage.delete(key).catch((error: unknown) => this.logger.warn(`Couldn't delete report file ${key}: ${String(error)}`));
    }
    return { id };
  }

  async getSchedules(organizationId: string, visible: readonly ReportTypeKey[]): Promise<ReportScheduleView[]> {
    const schedules = await this.prisma.reportSchedule.findMany({
      where: { organizationId, reportType: { in: [...visible] } },
      orderBy: { createdAt: 'desc' },
    });
    return schedules.map(toScheduleView);
  }

  async createSchedule(dto: CreateScheduleDto, organizationId: string, userId: string): Promise<ReportScheduleView> {
    const projects = await this.assertProjectsInOrganization(organizationId, dto.projects);
    const time = dto.time ?? DEFAULT_TIME;
    const timezone = this.assertTimeZone(dto.timezone ?? DEFAULT_TIMEZONE);
    const report = await this.generation.definitionFor(organizationId, dto.reportType, userId);
    const schedule = await this.prisma.reportSchedule.create({
      data: {
        reportId: report.id,
        reportType: dto.reportType,
        name: dto.name.trim(),
        frequency: dto.frequency,
        time,
        timezone,
        projects,
        recipients: dto.recipients ?? [],
        emails: dto.emails ?? [],
        outputFormat: dto.outputFormat ?? 'PDF',
        includeAiSummary: dto.includeAiSummary ?? false,
        nextRunAt: firstRunAt(time, timezone, new Date()),
        organizationId,
        createdBy: userId,
      },
    });
    return toScheduleView(schedule);
  }

  async updateSchedule(id: string, dto: UpdateScheduleDto, organizationId: string, visible: readonly ReportTypeKey[]): Promise<ReportScheduleView> {
    const schedule = await this.findSchedule(id, organizationId, visible);
    const projects = dto.projects === undefined ? undefined : await this.assertProjectsInOrganization(organizationId, dto.projects);
    const time = dto.time ?? schedule.time;
    const timezone = dto.timezone === undefined ? schedule.timezone : this.assertTimeZone(dto.timezone);
    const timingChanged = time !== schedule.time || timezone !== schedule.timezone || (dto.frequency !== undefined && dto.frequency !== schedule.frequency);
    const updated = await this.prisma.reportSchedule.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        frequency: dto.frequency,
        time,
        timezone,
        projects,
        recipients: dto.recipients,
        emails: dto.emails,
        outputFormat: dto.outputFormat,
        includeAiSummary: dto.includeAiSummary,
        ...(timingChanged && { nextRunAt: firstRunAt(time, timezone, new Date()) }),
      },
    });
    return toScheduleView(updated);
  }

  async toggleSchedule(id: string, organizationId: string, visible: readonly ReportTypeKey[]): Promise<ReportScheduleView> {
    const schedule = await this.findSchedule(id, organizationId, visible);
    const enabling = !schedule.enabled;
    const updated = await this.prisma.reportSchedule.update({
      where: { id },
      data: {
        enabled: enabling,
        // Resuming starts from the next slot instead of catching up on everything missed while paused.
        ...(enabling && schedule.nextRunAt <= new Date() && { nextRunAt: firstRunAt(schedule.time, schedule.timezone, new Date()) }),
      },
    });
    return toScheduleView(updated);
  }

  async runScheduleNow(id: string, organizationId: string, userId: string, visible: readonly ReportTypeKey[]): Promise<ReportScheduleView> {
    const schedule = await this.findSchedule(id, organizationId, visible);
    await this.scheduler.runNow(schedule, userId);
    return toScheduleView(await this.prisma.reportSchedule.findUniqueOrThrow({ where: { id } }));
  }

  async deleteSchedule(id: string, organizationId: string, visible: readonly ReportTypeKey[]): Promise<{ id: string }> {
    await this.findSchedule(id, organizationId, visible);
    await this.prisma.reportSchedule.delete({ where: { id } });
    return { id };
  }

  private async findSchedule(id: string, organizationId: string, visible: readonly ReportTypeKey[]): Promise<ReportSchedule> {
    const schedule = await this.prisma.reportSchedule.findFirst({
      where: { id, organizationId, reportType: { in: [...visible] } },
    });
    if (!schedule) throw new NotFoundException('Schedule not found.');
    return schedule;
  }

  private assertTimeZone(timezone: string): string {
    if (!isValidTimeZone(timezone)) throw new BadRequestException('Choose a valid time zone, like Asia/Kolkata.');
    return timezone;
  }

  /** Project ids arrive from the client, so every one must belong to the caller's organization. */
  private async assertProjectsInOrganization(organizationId: string, projectIds: string[] | undefined): Promise<string[]> {
    if (!projectIds?.length) return [];
    const unique = [...new Set(projectIds)];
    const found = await this.prisma.project.count({ where: { id: { in: unique }, organizationId, deletedAt: null } });
    if (found !== unique.length) throw new BadRequestException('Choose projects from your organization.');
    return unique;
  }
}
