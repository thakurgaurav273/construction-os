import { Prisma } from '@prisma/client';

export const MATERIAL_LIST_INCLUDE = {
  category: { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  _count: { select: { usages: true } },
} satisfies Prisma.MaterialInclude;

export type MaterialWithRelations = Prisma.MaterialGetPayload<{ include: typeof MATERIAL_LIST_INCLUDE }>;

export type MaterialStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'OVERSTOCKED';

export interface MaterialView {
  id: string;
  name: string;
  sku: string;
  unit: string;
  unitCost: number;
  quantity: number;
  reserved: number;
  incoming: number;
  available: number;
  minStock: number;
  maxStock: number | null;
  stockValue: number;
  status: MaterialStatus;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  projectCount: number;
  updatedAt: Date;
  createdAt: Date;
}

export function num(value: Prisma.Decimal | number | null | undefined): number {
  if (value == null) return 0;
  return typeof value === 'number' ? value : Number(value);
}

export function deriveMaterialStatus(
  quantity: number,
  reserved: number,
  minStock: number,
  maxStock: number | null,
): MaterialStatus {
  const available = quantity - reserved;
  if (quantity <= 0) return 'OUT_OF_STOCK';
  if (available <= minStock) return 'LOW_STOCK';
  if (maxStock != null && quantity > maxStock) return 'OVERSTOCKED';
  return 'IN_STOCK';
}

export function toMaterialView(material: MaterialWithRelations): MaterialView {
  const quantity = num(material.quantity);
  const reserved = num(material.reserved);
  const minStock = num(material.minStock);
  const maxStock = material.maxStock == null ? null : num(material.maxStock);
  const unitCost = num(material.unitCost);
  return {
    id: material.id,
    name: material.name,
    sku: material.sku,
    unit: material.unit,
    unitCost,
    quantity,
    reserved,
    incoming: num(material.incoming),
    available: quantity - reserved,
    minStock,
    maxStock,
    stockValue: quantity * unitCost,
    status: deriveMaterialStatus(quantity, reserved, minStock, maxStock),
    imageUrl: material.imageUrl,
    categoryId: material.categoryId,
    categoryName: material.category?.name ?? null,
    supplierId: material.supplierId,
    supplierName: material.supplier?.name ?? null,
    projectCount: material._count.usages,
    updatedAt: material.updatedAt,
    createdAt: material.createdAt,
  };
}
