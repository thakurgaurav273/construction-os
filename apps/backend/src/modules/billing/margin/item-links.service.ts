import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { ItemLinksDto } from '../dto/margin.dto';
import { normalizeItemNo } from '../import/measurement-book-parser';

export interface ClientItemOption {
  id: string;
  itemNo: string;
  rateCode: string | null;
  description: string;
  unit: string;
  rate: number;
}

export interface ItemLinkOptionsView {
  clientContracts: { id: string; code: string; title: string; partyName: string | null; items: ClientItemOption[] }[];
  /** Subcontract item → client item it most likely delivers, for items not linked yet. */
  suggestions: Record<string, string>;
}

const words = (text: string): string => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const code = (value: string | null): string | null => (value ? value.toLowerCase().replace(/[^a-z0-9.]+/g, '') : null);

/**
 * Links each subcontract BOQ line to the client BOQ line it delivers, which is what margin per item is
 * measured on. Suggestions are plain matching (same rate code, then same description, then same item
 * number with the same unit), only where the match is unique; a person confirms them.
 */
@Injectable()
export class ItemLinksService {
  constructor(private readonly prisma: PrismaService) {}

  async options(contractId: string, organizationId: string): Promise<ItemLinkOptionsView> {
    const contract = await this.findSubcontract(contractId, organizationId);
    const clientContracts = await this.prisma.contract.findMany({
      where: { organizationId, projectId: contract.projectId, direction: 'CLIENT' },
      include: { client: { select: { name: true } }, items: { orderBy: [{ sortOrder: 'asc' }, { itemNo: 'asc' }] } },
      orderBy: { code: 'asc' },
    });
    const clientItems = clientContracts.flatMap((client) => client.items);

    const suggestions: Record<string, string> = {};
    // Each rule only counts when it points at exactly one client line; ambiguous lines are left to a person.
    const only = (matches: typeof clientItems): string | undefined => (matches.length === 1 ? matches[0].id : undefined);
    for (const item of contract.items.filter((candidate) => !candidate.clientItemId)) {
      const match = (item.rateCode ? only(clientItems.filter((client) => code(client.rateCode) === code(item.rateCode))) : undefined)
        ?? only(clientItems.filter((client) => words(client.description) === words(item.description)))
        ?? only(clientItems.filter((client) => normalizeItemNo(client.itemNo) === normalizeItemNo(item.itemNo) && client.unit.toLowerCase() === item.unit.toLowerCase()));
      if (match) suggestions[item.id] = match;
    }

    return {
      clientContracts: clientContracts.map((client) => ({
        id: client.id,
        code: client.code,
        title: client.title,
        partyName: client.client?.name ?? null,
        items: client.items.map((item) => ({
          id: item.id, itemNo: item.itemNo, rateCode: item.rateCode, description: item.description, unit: item.unit, rate: item.rate.toNumber(),
        })),
      })),
      suggestions,
    };
  }

  async save(contractId: string, organizationId: string, dto: ItemLinksDto): Promise<void> {
    const contract = await this.findSubcontract(contractId, organizationId);
    const ownItems = new Set(contract.items.map((item) => item.id));
    if (dto.links.some((link) => !ownItems.has(link.itemId))) throw new BadRequestException('Some lines aren’t on this subcontract. Reload and try again.');

    const clientItemIds = [...new Set(dto.links.flatMap((link) => (link.clientItemId ? [link.clientItemId] : [])))];
    const valid = await this.prisma.contractItem.count({
      where: { id: { in: clientItemIds }, contract: { organizationId, projectId: contract.projectId, direction: 'CLIENT' } },
    });
    if (valid !== clientItemIds.length) throw new BadRequestException('Link only to client BOQ lines on the same project.');

    await this.prisma.$transaction(dto.links.map((link) => this.prisma.contractItem.update({
      where: { id: link.itemId },
      data: { clientItemId: link.clientItemId ?? null },
    })));
  }

  private async findSubcontract(contractId: string, organizationId: string) {
    const contract = await this.prisma.contract.findFirst({ where: { id: contractId, organizationId }, include: { items: true } });
    if (!contract) throw new NotFoundException('Contract not found.');
    if (contract.direction !== 'SUBCONTRACT') throw new ConflictException('Only subcontract lines are linked to client BOQ lines.');
    return contract;
  }
}
