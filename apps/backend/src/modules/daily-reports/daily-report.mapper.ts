import { DailyReportStatus, Prisma } from '@prisma/client';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { UpdateDailyReportDto } from './dto/update-daily-report.dto';

const USER_SUMMARY_SELECT = { select: { id: true, name: true, avatar: true } } as const;

export const DAILY_REPORT_LIST_INCLUDE = {
  submittedBy: USER_SUMMARY_SELECT,
  reviewedBy: USER_SUMMARY_SELECT,
  project: { select: { id: true, name: true, code: true } },
  _count: { select: { documents: true } },
} satisfies Prisma.DailyReportInclude;

export const DAILY_REPORT_DETAIL_INCLUDE = {
  ...DAILY_REPORT_LIST_INCLUDE,
  documents: {
    select: { id: true, name: true, type: true, mimeType: true, size: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.DailyReportInclude;

type DailyReportListRecord = Prisma.DailyReportGetPayload<{ include: typeof DAILY_REPORT_LIST_INCLUDE }>;
type DailyReportDetailRecord = Prisma.DailyReportGetPayload<{ include: typeof DAILY_REPORT_DETAIL_INCLUDE }>;

export interface UserSummary {
  id: string;
  name: string;
  avatar: string | null;
}

export interface DailyReportAttachment {
  id: string;
  name: string;
  type: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface DailyReportView {
  id: string;
  projectId: string;
  project: { id: string; name: string; code: string };
  date: Date;
  weather: string | null;
  overallProgress: number | null;
  workCompleted: string | null;
  remarks: string | null;
  labourCount: number;
  status: DailyReportStatus;
  aiSummary: string | null;
  labourDetails: Prisma.JsonValue;
  materialsConsumed: Prisma.JsonValue;
  equipmentUsed: Prisma.JsonValue;
  issues: Prisma.JsonValue;
  submittedBy: UserSummary;
  submittedAt: Date | null;
  reviewedBy: UserSummary | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  attachmentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyReportDetailView extends DailyReportView {
  attachments: DailyReportAttachment[];
}

export function toDailyReportView(report: DailyReportListRecord): DailyReportView {
  return {
    id: report.id,
    projectId: report.projectId,
    project: report.project,
    date: report.date,
    weather: report.weather,
    overallProgress: report.overallProgress,
    workCompleted: report.workCompleted,
    remarks: report.remarks,
    labourCount: report.labourCount,
    status: report.status,
    aiSummary: report.aiSummary,
    labourDetails: report.labourDetails,
    materialsConsumed: report.materialsConsumed ?? [],
    equipmentUsed: report.equipmentUsed ?? [],
    issues: report.issues ?? [],
    submittedBy: report.submittedBy,
    submittedAt: report.submittedAt,
    reviewedBy: report.reviewedBy,
    reviewedAt: report.reviewedAt,
    reviewNote: report.reviewNote,
    attachmentCount: report._count.documents,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

export function toDailyReportDetailView(report: DailyReportDetailRecord): DailyReportDetailView {
  return { ...toDailyReportView(report), attachments: report.documents };
}

export interface DailyReportContentData {
  date?: Date;
  weather?: string | null;
  overallProgress?: number | null;
  workCompleted?: string | null;
  remarks?: string | null;
  labourDetails?: Prisma.InputJsonObject;
  labourCount?: number;
  materialsConsumed?: Prisma.InputJsonArray;
  equipmentUsed?: Prisma.InputJsonArray;
  issues?: Prisma.InputJsonArray;
}

/**
 * Converts validated input into Prisma data. Keys left undefined are untouched on update,
 * blank text clears the field, and labourCount is always derived from the labour breakdown
 * so the headline number can never disagree with its parts.
 */
export function toDailyReportContentData(dto: UpdateDailyReportDto): DailyReportContentData {
  const labour = dto.labourDetails;

  return {
    date: dto.date ? new Date(dto.date) : undefined,
    weather: normalizeOptionalText(dto.weather),
    overallProgress: dto.overallProgress,
    workCompleted: normalizeOptionalText(dto.workCompleted),
    remarks: normalizeOptionalText(dto.remarks),
    labourDetails: labour
      ? { skilled: labour.skilled, unskilled: labour.unskilled, supervisors: labour.supervisors }
      : undefined,
    labourCount: labour ? labour.skilled + labour.unskilled + labour.supervisors : undefined,
    materialsConsumed: dto.materialsConsumed?.map(({ material, quantity, unit }) => ({
      material: material.trim(),
      quantity,
      unit: unit.trim(),
    })),
    equipmentUsed: dto.equipmentUsed?.map(({ name, hours }) => ({ name: name.trim(), hours })),
    issues: dto.issues?.map(({ severity, description }) => ({
      severity,
      description: description.trim(),
    })),
  };
}
