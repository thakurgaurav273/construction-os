import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { roundMoney, roundQuantity } from '../billing-math';

export interface MarginSubcontractLine {
  contractId: string;
  contractCode: string;
  vendorName: string | null;
  itemId: string;
  itemNo: string;
  unit: string;
  rate: number;
  certifiedQuantity: number;
  cost: number;
}

export interface MarginRow {
  clientItemId: string;
  contract: { id: string; code: string; partyName: string | null };
  itemNo: string;
  description: string;
  unit: string;
  rate: number;
  certifiedQuantity: number;
  billed: number;
  subcontracts: MarginSubcontractLine[];
  cost: number;
  margin: number;
  /** Margin as a share of what was billed; null before anything is billed. */
  marginPercent: number | null;
  /** Client rate less the average subcontract rate per unit, when the units match. */
  rateMargin: number | null;
}

export interface MarginView {
  project: { id: string; name: string };
  rows: MarginRow[];
  /** Subcontract work not linked to a client line yet: a cost with nothing to set it against. */
  unlinked: MarginSubcontractLine[];
  totals: {
    billed: number;
    subcontractCost: number;
    unlinkedCost: number;
    margin: number;
    marginPercent: number | null;
    /** Recovered from subcontractors on certified bills for material we supplied. */
    materialRecovered: number;
  };
}

const percent = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : null);

/**
 * Margin per client BOQ line on a project: what we have certified to the client against what subcontractors
 * have certified for the same work, at the rates frozen on each certified bill. Figures are work value
 * before taxes and deductions; material recovered from subcontractors is shown on its own, because the
 * material's cost sits in procurement, not here.
 */
@Injectable()
export class MarginService {
  constructor(private readonly prisma: PrismaService) {}

  async forProject(organizationId: string, projectId: string): Promise<MarginView> {
    const project = await this.prisma.project.findFirst({ where: { id: projectId, organizationId, deletedAt: null }, select: { id: true, name: true } });
    if (!project) throw new NotFoundException('Project not found.');

    const [contracts, certifiedLines, recoveries] = await Promise.all([
      this.prisma.contract.findMany({
        where: { organizationId, projectId },
        include: { items: true, client: { select: { name: true } }, vendor: { select: { name: true } } },
        orderBy: { code: 'asc' },
      }),
      this.prisma.raBillLine.findMany({
        where: { bill: { organizationId, projectId, status: 'CERTIFIED' } },
        select: { contractItemId: true, certifiedQuantity: true, rate: true },
      }),
      this.prisma.raBillAdjustment.aggregate({
        where: { kind: 'MATERIAL_RECOVERY', bill: { organizationId, projectId, status: 'CERTIFIED' } },
        _sum: { value: true },
      }),
    ]);

    const certified = new Map<string, { quantity: number; amount: number }>();
    for (const line of certifiedLines) {
      const quantity = line.certifiedQuantity?.toNumber() ?? 0;
      const entry = certified.get(line.contractItemId) ?? { quantity: 0, amount: 0 };
      entry.quantity += quantity;
      entry.amount += quantity * (line.rate?.toNumber() ?? 0);
      certified.set(line.contractItemId, entry);
    }
    const done = (itemId: string): { quantity: number; amount: number } => {
      const entry = certified.get(itemId) ?? { quantity: 0, amount: 0 };
      return { quantity: roundQuantity(entry.quantity), amount: roundMoney(entry.amount) };
    };

    const subLines: (MarginSubcontractLine & { clientItemId: string | null })[] = contracts
      .filter((contract) => contract.direction === 'SUBCONTRACT')
      .flatMap((contract) => contract.items.map((item) => ({
        contractId: contract.id,
        contractCode: contract.code,
        vendorName: contract.vendor?.name ?? null,
        itemId: item.id,
        itemNo: item.itemNo,
        unit: item.unit,
        rate: item.rate.toNumber(),
        certifiedQuantity: done(item.id).quantity,
        cost: done(item.id).amount,
        clientItemId: item.clientItemId,
      })));

    const rows: MarginRow[] = contracts
      .filter((contract) => contract.direction === 'CLIENT')
      .flatMap((contract) => contract.items.map((item): MarginRow => {
        const subcontracts = subLines.filter((line) => line.clientItemId === item.id).map(({ clientItemId: _link, ...line }) => line);
        const billed = done(item.id);
        const cost = roundMoney(subcontracts.reduce((sum, line) => sum + line.cost, 0));
        const subQuantity = subcontracts.reduce((sum, line) => sum + line.certifiedQuantity, 0);
        const sameUnit = subcontracts.length > 0 && subcontracts.every((line) => line.unit.toLowerCase() === item.unit.toLowerCase());
        return {
          clientItemId: item.id,
          contract: { id: contract.id, code: contract.code, partyName: contract.client?.name ?? null },
          itemNo: item.itemNo,
          description: item.description,
          unit: item.unit,
          rate: item.rate.toNumber(),
          certifiedQuantity: billed.quantity,
          billed: billed.amount,
          subcontracts,
          cost,
          margin: roundMoney(billed.amount - cost),
          marginPercent: percent(billed.amount - cost, billed.amount),
          rateMargin: sameUnit && subQuantity > 0 ? roundMoney(item.rate.toNumber() - cost / subQuantity) : null,
        };
      }))
      .filter((row) => row.billed > 0 || row.subcontracts.length > 0);

    const unlinked = subLines.filter((line) => !line.clientItemId && line.cost > 0).map(({ clientItemId: _link, ...line }) => line);
    const billed = roundMoney(rows.reduce((sum, row) => sum + row.billed, 0));
    const subcontractCost = roundMoney(subLines.reduce((sum, line) => sum + line.cost, 0));
    return {
      project,
      rows,
      unlinked,
      totals: {
        billed,
        subcontractCost,
        unlinkedCost: roundMoney(unlinked.reduce((sum, line) => sum + line.cost, 0)),
        margin: roundMoney(billed - subcontractCost),
        marginPercent: percent(billed - subcontractCost, billed),
        materialRecovered: roundMoney(recoveries._sum.value?.toNumber() ?? 0),
      },
    };
  }
}
