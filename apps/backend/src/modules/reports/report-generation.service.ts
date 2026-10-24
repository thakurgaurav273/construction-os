import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GeneratedReport, Prisma } from '@prisma/client';
import { JobMeta, JobsService } from '../../common/jobs';
import { StorageService } from '../../common/storage/storage.service';
import { PrismaService } from '../../database/prisma.service';
import { AiFeaturesService } from '../ai/ai-features.service';
import { ReceivablesService } from '../billing/receivables.service';
import { BudgetService } from '../finance/budget.service';
import { REPORT_BUILDERS } from './content/builders';
import { reportAiContext } from './content/report-ai-context';
import { ReportDocument, ReportScope } from './content/report-document';
import { ReportDeliveryService } from './report-delivery.service';
import { renderReportExcel } from './render/excel-renderer';
import { renderReportPdf } from './render/pdf-renderer';
import { DEFAULT_BRAND_COLOR, ReportBranding } from './render/report-format';
import { GENERATE_REPORT_JOB, REPORT_TITLES } from './reports.constants';

interface GenerateReportJob {
  reportId: string;
  includeAiSummary: boolean;
}

export interface QueueReportInput {
  organizationId: string;
  userId: string;
  type: string;
  name: string;
  format: string;
  projectIds: string[];
  from: Date;
  to: Date;
  includeAiSummary: boolean;
  scheduleId?: string;
}

const PDF_TYPE = 'application/pdf';
const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

class ReportStepError extends Error {}

function fileBaseName(name: string, generatedAt: Date): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'report';
  return `${slug}-${generatedAt.toISOString().slice(0, 10)}`;
}

/**
 * Turns a pending report into files: builds its content for the chosen period and projects, renders the PDF
 * and/or Excel file, saves them to object storage and, for scheduled reports, hands over for emailing.
 * Runs as a background job, so requests only create the pending record.
 */
@Injectable()
export class ReportGenerationService implements OnModuleInit {
  private readonly logger = new Logger(ReportGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly jobs: JobsService,
    private readonly receivables: ReceivablesService,
    private readonly budgets: BudgetService,
    private readonly ai: AiFeaturesService,
    private readonly delivery: ReportDeliveryService,
  ) {}

  onModuleInit(): void {
    this.jobs.register<GenerateReportJob>(GENERATE_REPORT_JOB, (job, meta) => this.generate(job, meta));
  }

  async queue(input: QueueReportInput): Promise<GeneratedReport> {
    const definition = await this.definitionFor(input.organizationId, input.type, input.userId);
    const report = await this.prisma.generatedReport.create({
      data: {
        reportId: definition.id,
        organizationId: input.organizationId,
        name: input.name,
        type: input.type,
        format: input.format,
        status: 'PENDING',
        projectIds: input.projectIds,
        projectId: input.projectIds.length === 1 ? input.projectIds[0] : null,
        periodFrom: input.from,
        periodTo: input.to,
        scheduleId: input.scheduleId ?? null,
        generatedBy: input.userId,
      },
    });
    await this.jobs.enqueue<GenerateReportJob>(
      GENERATE_REPORT_JOB,
      { reportId: report.id, includeAiSummary: input.includeAiSummary },
      { jobId: `report-${report.id}` },
    );
    return report;
  }

  /** Every generated report and schedule hangs off a per-type report definition, created on first use. */
  async definitionFor(organizationId: string, type: string, userId: string): Promise<{ id: string }> {
    const existing = await this.prisma.report.findFirst({ where: { organizationId, type }, select: { id: true } });
    if (existing) return existing;
    return this.prisma.report.create({
      data: { organizationId, type, name: REPORT_TITLES[type] ?? type, description: '', projects: [], createdBy: userId },
      select: { id: true },
    });
  }

  private async generate(job: GenerateReportJob, meta: JobMeta): Promise<void> {
    const report = await this.prisma.generatedReport.findUnique({ where: { id: job.reportId } });
    if (!report || report.status === 'COMPLETED') return;
    await this.prisma.generatedReport.update({ where: { id: report.id }, data: { status: 'GENERATING', error: null } });

    try {
      const branding = await this.branding(report.organizationId);
      const document = await this.buildDocument(report);
      if (job.includeAiSummary) document.aiSummary = await this.summary(report, document, branding.currency);
      // Snapshot before rendering: the stored content must not pick up anything a renderer adds.
      const content: Prisma.InputJsonValue = JSON.parse(JSON.stringify(document));
      const files = await this.renderAndStore(report, document, branding);
      await this.prisma.generatedReport.update({
        where: { id: report.id },
        data: {
          status: 'COMPLETED',
          data: content,
          pdfKey: files.pdfKey,
          excelKey: files.excelKey,
          fileSize: files.size,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Report ${report.id} failed on attempt ${meta.attempt}`, error instanceof Error ? error.stack : String(error));
      if (!meta.isLastAttempt) throw error;
      const message = error instanceof ReportStepError ? error.message : 'Something went wrong while building this report. Try generating it again.';
      await this.prisma.generatedReport.update({ where: { id: report.id }, data: { status: 'FAILED', error: message } });
      if (report.scheduleId) {
        await this.prisma.reportSchedule.updateMany({ where: { id: report.scheduleId }, data: { lastStatus: 'FAILED', lastError: message } });
      }
      return;
    }

    if (report.scheduleId) await this.delivery.deliver(report.id);
  }

  private async buildDocument(report: GeneratedReport): Promise<ReportDocument> {
    const builder = REPORT_BUILDERS[report.type];
    if (!builder) throw new ReportStepError(`Reports of type ${report.type} aren’t supported.`);
    const allProjects = report.projectIds.length === 0;
    const [organization, projects] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: report.organizationId }, select: { name: true } }),
      this.prisma.project.findMany({
        where: { organizationId: report.organizationId, deletedAt: null, ...(allProjects ? {} : { id: { in: report.projectIds } }) },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    const now = new Date();
    const scope: ReportScope = {
      prisma: this.prisma,
      organizationId: report.organizationId,
      projects,
      allProjects,
      from: report.periodFrom ?? report.generatedAt,
      to: report.periodTo ?? now,
      receivables: this.receivables,
      budgets: this.budgets,
    };
    const body = await builder(scope);
    return {
      type: report.type,
      title: report.name,
      subtitle: body.subtitle,
      organizationName: organization.name,
      generatedAt: now.toISOString(),
      period: { from: scope.from.toISOString(), to: scope.to.toISOString() },
      projectNames: projects.map((project) => project.name),
      allProjects,
      metrics: body.metrics,
      sections: body.sections,
      aiSummary: null,
    };
  }

  /** The summary is a bonus: without AI access, or if the call fails, the report goes out without it. */
  private async summary(report: GeneratedReport, document: ReportDocument, currency: string): Promise<string | null> {
    try {
      return await this.ai.summarizeReport(report.organizationId, report.generatedBy, reportAiContext(document, currency));
    } catch (error) {
      this.logger.warn(`Report ${report.id} has no AI summary: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async branding(organizationId: string): Promise<ReportBranding> {
    const organization = await this.prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { name: true, currency: true, timezone: true, brandColor: true, logo: true },
    });
    return {
      organizationName: organization.name,
      currency: organization.currency,
      timezone: organization.timezone,
      brandColor: organization.brandColor ?? DEFAULT_BRAND_COLOR,
      logo: await this.logo(organization.logo),
    };
  }

  /** PDFs can embed PNG and JPEG only; a missing or other logo just leaves the header text-only. */
  private async logo(key: string | null): Promise<Buffer | null> {
    if (!key || /^https?:\/\//.test(key) || !/\.(png|jpe?g)$/i.test(key)) return null;
    return this.storage.download(key).catch((error: unknown) => {
      this.logger.warn(`Couldn't load the organization logo for a report: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    });
  }

  private async renderAndStore(
    report: GeneratedReport,
    document: ReportDocument,
    branding: ReportBranding,
  ): Promise<{ pdfKey: string | null; excelKey: string | null; size: number }> {
    const baseName = fileBaseName(report.name, report.generatedAt);
    const folder = `organizations/${report.organizationId}/reports/${report.id}`;
    const wantsPdf = report.format === 'PDF' || report.format === 'BOTH';
    const wantsExcel = report.format === 'EXCEL' || report.format === 'BOTH';
    const [pdf, excel] = await Promise.all([
      wantsPdf ? renderReportPdf(document, branding) : null,
      wantsExcel ? renderReportExcel(document, branding) : null,
    ]);
    try {
      const pdfKey = pdf ? `${folder}/${baseName}.pdf` : null;
      const excelKey = excel ? `${folder}/${baseName}.xlsx` : null;
      await Promise.all([
        pdf && pdfKey ? this.storage.upload(pdfKey, pdf, PDF_TYPE) : null,
        excel && excelKey ? this.storage.upload(excelKey, excel, EXCEL_TYPE) : null,
      ]);
      return { pdfKey, excelKey, size: (pdf?.length ?? 0) + (excel?.length ?? 0) };
    } catch (error) {
      this.logger.error('Report upload failed', error instanceof Error ? error.stack : String(error));
      throw new ReportStepError('The report was built but couldn’t be saved to file storage. An admin can check Settings → Integrations.');
    }
  }
}
