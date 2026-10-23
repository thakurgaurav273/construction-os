import { Prisma, StockTransferStatus, WarehouseType } from '@prisma/client';
import { num, round2 } from './inventory.helpers';

const PERSON = { select: { id: true, name: true } } as const;

export const TRANSFER_LIST_INCLUDE = {
  fromWarehouse: { select: { id: true, name: true, type: true } },
  toWarehouse: { select: { id: true, name: true, type: true } },
  items: { select: { quantity: true } },
  requestedBy: PERSON,
  approvedBy: PERSON,
  completedBy: PERSON,
} satisfies Prisma.StockTransferInclude;

export const TRANSFER_DETAIL_INCLUDE = {
  fromWarehouse: { select: { id: true, name: true, type: true, city: true } },
  toWarehouse: { select: { id: true, name: true, type: true, city: true } },
  items: { include: { material: { select: { id: true, name: true, sku: true, unit: true } } } },
  transactions: {
    orderBy: { occurredAt: 'desc' },
    include: { warehouse: { select: { id: true, name: true } } },
  },
  requestedBy: PERSON,
  approvedBy: PERSON,
  completedBy: PERSON,
} satisfies Prisma.StockTransferInclude;

type TransferListRow = Prisma.StockTransferGetPayload<{ include: typeof TRANSFER_LIST_INCLUDE }>;
type TransferDetailRow = Prisma.StockTransferGetPayload<{ include: typeof TRANSFER_DETAIL_INCLUDE }>;

interface Person { id: string; name: string }

export interface TransferListView {
  id: string;
  code: string;
  status: StockTransferStatus;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  itemCount: number;
  totalQuantity: number;
  note: string | null;
  reviewNote: string | null;
  requestedBy: Person;
  approvedBy: Person | null;
  completedBy: Person | null;
  createdAt: Date;
  approvedAt: Date | null;
  completedAt: Date | null;
}

export interface TransferTimelineStep {
  stage: string;
  date: Date | null;
  done: boolean;
  actor: string | null;
}

export interface TransferDetailView {
  id: string;
  code: string;
  status: StockTransferStatus;
  fromWarehouse: { id: string; name: string; type: WarehouseType; city: string | null };
  toWarehouse: { id: string; name: string; type: WarehouseType; city: string | null };
  note: string | null;
  reviewNote: string | null;
  requestedBy: Person;
  approvedBy: Person | null;
  completedBy: Person | null;
  createdAt: Date;
  approvedAt: Date | null;
  completedAt: Date | null;
  items: { id: string; materialId: string; materialName: string; sku: string; unit: string; quantity: number }[];
  transactions: { id: string; type: string; warehouseName: string; quantity: number; occurredAt: Date }[];
  timeline: TransferTimelineStep[];
}

export function toTransferListView(transfer: TransferListRow): TransferListView {
  return {
    id: transfer.id,
    code: transfer.code,
    status: transfer.status,
    fromWarehouseId: transfer.fromWarehouseId,
    fromWarehouseName: transfer.fromWarehouse.name,
    toWarehouseId: transfer.toWarehouseId,
    toWarehouseName: transfer.toWarehouse.name,
    itemCount: transfer.items.length,
    totalQuantity: round2(transfer.items.reduce((sum, item) => sum + num(item.quantity), 0)),
    note: transfer.note,
    reviewNote: transfer.reviewNote,
    requestedBy: transfer.requestedBy,
    approvedBy: transfer.approvedBy,
    completedBy: transfer.completedBy,
    createdAt: transfer.createdAt,
    approvedAt: transfer.approvedAt,
    completedAt: transfer.completedAt,
  };
}

export function toTransferDetailView(transfer: TransferDetailRow): TransferDetailView {
  return {
    id: transfer.id,
    code: transfer.code,
    status: transfer.status,
    fromWarehouse: transfer.fromWarehouse,
    toWarehouse: transfer.toWarehouse,
    note: transfer.note,
    reviewNote: transfer.reviewNote,
    requestedBy: transfer.requestedBy,
    approvedBy: transfer.approvedBy,
    completedBy: transfer.completedBy,
    createdAt: transfer.createdAt,
    approvedAt: transfer.approvedAt,
    completedAt: transfer.completedAt,
    items: transfer.items.map((item) => ({
      id: item.id,
      materialId: item.materialId,
      materialName: item.material.name,
      sku: item.material.sku,
      unit: item.material.unit,
      quantity: num(item.quantity),
    })),
    transactions: transfer.transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      warehouseName: transaction.warehouse.name,
      quantity: num(transaction.quantity),
      occurredAt: transaction.occurredAt,
    })),
    timeline: buildTimeline(transfer),
  };
}

function buildTimeline(transfer: TransferDetailRow): TransferTimelineStep[] {
  const steps: TransferTimelineStep[] = [
    { stage: 'Requested', date: transfer.createdAt, done: true, actor: transfer.requestedBy.name },
    { stage: 'Approved', date: transfer.approvedAt, done: transfer.approvedAt != null, actor: transfer.approvedBy?.name ?? null },
    { stage: 'Received', date: transfer.completedAt, done: transfer.completedAt != null, actor: transfer.completedBy?.name ?? null },
  ];
  if (transfer.status === 'REJECTED' || transfer.status === 'CANCELLED') {
    const stopped = { stage: transfer.status === 'REJECTED' ? 'Rejected' : 'Cancelled', date: transfer.updatedAt, done: true, actor: null };
    return transfer.approvedAt ? [steps[0], steps[1], stopped] : [steps[0], stopped];
  }
  return steps;
}
