import { MaterialIssueType, Prisma } from '@prisma/client';
import { num } from './material.mapper';

export const MATERIAL_ISSUE_INCLUDE = {
  material: { select: { id: true, name: true, unit: true } },
  warehouse: { select: { id: true, name: true } },
  issuedBy: { select: { id: true, name: true } },
} satisfies Prisma.MaterialIssueInclude;

type MaterialIssueWithRelations = Prisma.MaterialIssueGetPayload<{ include: typeof MATERIAL_ISSUE_INCLUDE }>;

export interface MaterialIssueView {
  id: string;
  code: string;
  type: MaterialIssueType;
  quantity: number;
  unitCost: number;
  value: number;
  note: string | null;
  issuedOn: Date;
  material: { id: string; name: string; unit: string };
  warehouse: { id: string; name: string };
  issuedBy: { id: string; name: string };
}

export interface ProjectMaterialLine {
  materialId: string;
  name: string;
  sku: string;
  unit: string;
  planned: number;
  /** Net quantity issued to the site: issues minus returns. */
  consumed: number;
  /** Planned minus consumed; negative when the site has used more than planned. */
  remaining: number;
  /** Consumed quantity at the material's current carrying cost. */
  consumedValue: number;
  storeAvailable: number;
}

export interface ProjectMaterialsView {
  summary: {
    materialCount: number;
    consumedValue: number;
    overPlanCount: number;
    issuesThisWeek: number;
  };
  items: ProjectMaterialLine[];
  recentIssues: MaterialIssueView[];
}

export function toMaterialIssueView(issue: MaterialIssueWithRelations): MaterialIssueView {
  const quantity = num(issue.quantity);
  const unitCost = num(issue.unitCost);
  return {
    id: issue.id,
    code: issue.code,
    type: issue.type,
    quantity,
    unitCost,
    value: Math.round(quantity * unitCost * 100) / 100,
    note: issue.note,
    issuedOn: issue.issuedOn,
    material: issue.material,
    warehouse: issue.warehouse,
    issuedBy: issue.issuedBy,
  };
}
