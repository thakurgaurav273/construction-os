import { MaterialRequestStatus, Prisma } from '@prisma/client';
import { num } from './material.mapper';
import { MATERIAL_ISSUE_INCLUDE, MaterialIssueView, toMaterialIssueView } from './project-materials.mapper';

/** Quantities are stored to three decimals; anything smaller is rounding, not stock still owed. */
export const QUANTITY_TOLERANCE = 0.0005;

export const OPEN_REQUEST_STATUSES: MaterialRequestStatus[] = ['PENDING', 'APPROVED', 'PARTLY_ISSUED'];
export const ISSUABLE_REQUEST_STATUSES: MaterialRequestStatus[] = ['APPROVED', 'PARTLY_ISSUED'];

const PERSON = { select: { id: true, name: true } } as const;

export const MATERIAL_REQUEST_INCLUDE = {
  project: { select: { id: true, name: true, code: true } },
  requestedBy: PERSON,
  reviewedBy: PERSON,
  closedBy: PERSON,
  items: {
    include: { material: { select: { id: true, name: true, sku: true, unit: true } } },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.MaterialRequestInclude;

type MaterialRequestRow = Prisma.MaterialRequestGetPayload<{ include: typeof MATERIAL_REQUEST_INCLUDE }>;
type MaterialIssueRow = Prisma.MaterialIssueGetPayload<{ include: typeof MATERIAL_ISSUE_INCLUDE }>;

export interface MaterialRequestItemView {
  id: string;
  materialId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  issued: number;
  /** Still owed to the site; zero once the line is fully issued. */
  remaining: number;
}

export interface MaterialRequestView {
  id: string;
  code: string;
  status: MaterialRequestStatus;
  projectId: string;
  project: { id: string; name: string; code: string };
  neededBy: Date | null;
  note: string | null;
  reviewNote: string | null;
  requestedBy: { id: string; name: string };
  reviewedBy: { id: string; name: string } | null;
  reviewedAt: Date | null;
  closedBy: { id: string; name: string } | null;
  closedAt: Date | null;
  createdAt: Date;
  items: MaterialRequestItemView[];
}

export interface MaterialRequestDetailView extends MaterialRequestView {
  /** Issue notes raised against this request, newest first. */
  issues: MaterialIssueView[];
}

export function remainingQuantity(item: { quantity: Prisma.Decimal; issuedQuantity: Prisma.Decimal }): number {
  const remaining = num(item.quantity) - num(item.issuedQuantity);
  return remaining > QUANTITY_TOLERANCE ? Math.round(remaining * 1000) / 1000 : 0;
}

export function toMaterialRequestView(request: MaterialRequestRow): MaterialRequestView {
  return {
    id: request.id,
    code: request.code,
    status: request.status,
    projectId: request.projectId,
    project: request.project,
    neededBy: request.neededBy,
    note: request.note,
    reviewNote: request.reviewNote,
    requestedBy: request.requestedBy,
    reviewedBy: request.reviewedBy,
    reviewedAt: request.reviewedAt,
    closedBy: request.closedBy,
    closedAt: request.closedAt,
    createdAt: request.createdAt,
    items: request.items.map((item) => ({
      id: item.id,
      materialId: item.material.id,
      name: item.material.name,
      sku: item.material.sku,
      unit: item.material.unit,
      quantity: num(item.quantity),
      issued: num(item.issuedQuantity),
      remaining: remainingQuantity(item),
    })),
  };
}

export function toMaterialRequestDetailView(request: MaterialRequestRow, issues: MaterialIssueRow[]): MaterialRequestDetailView {
  return { ...toMaterialRequestView(request), issues: issues.map(toMaterialIssueView) };
}

/** "MRQ-0004 is waiting for approval", for refusing an action the request's status doesn't allow. */
export function describeRequestStatus(code: string, status: MaterialRequestStatus): string {
  const state: Record<MaterialRequestStatus, string> = {
    PENDING: 'waiting for approval',
    APPROVED: 'approved and waiting to be issued',
    PARTLY_ISSUED: 'partly issued',
    ISSUED: 'fully issued',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
    CLOSED: 'closed',
  };
  return `${code} is ${state[status]}`;
}
