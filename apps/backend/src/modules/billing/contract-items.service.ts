import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { OPEN_BILL_STATUSES } from './billing.constants';
import { ContractDetailView } from './contract.mapper';
import { ContractsService } from './contracts.service';
import { ContractItemDto, ReplaceContractItemsDto } from './dto/contract.dto';
import { RaBillTotalsService } from './ra-bill-totals.service';

function itemData(item: ContractItemDto, sortOrder: number): Omit<Prisma.ContractItemUncheckedCreateInput, 'contractId'> {
  return {
    itemNo: item.itemNo,
    rateCode: item.rateCode?.trim() || null,
    description: item.description,
    unit: item.unit,
    quantity: item.quantity,
    rate: item.rate,
    isExtra: item.isExtra ?? false,
    sortOrder,
  };
}

/**
 * The contract's BOQ, saved as a whole list. Lines already on a bill can be edited but not removed, so bill
 * history always points at a real item. An open bill is re-priced when rates change; certified bills keep
 * the rate they were certified at.
 */
@Injectable()
export class ContractItemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contracts: ContractsService,
    private readonly totals: RaBillTotalsService,
  ) {}

  async replaceItems(contractId: string, organizationId: string, dto: ReplaceContractItemsDto): Promise<ContractDetailView> {
    const contract = await this.contracts.findContractOrThrow(contractId, organizationId);
    if (contract.status === 'CLOSED') throw new ConflictException('This contract is closed. Reopen it to change the BOQ.');
    this.assertUniqueItemNumbers(dto.items);

    const existingIds = new Set(contract.items.map((item) => item.id));
    const unknown = dto.items.filter((item) => item.id && !existingIds.has(item.id));
    if (unknown.length > 0) throw new BadRequestException('Some BOQ lines no longer exist. Reload the contract and try again.');

    const keptIds = new Set(dto.items.flatMap((item) => (item.id ? [item.id] : [])));
    const removed = contract.items.filter((item) => !keptIds.has(item.id));
    const removedInUse = await this.prisma.raBillLine.findMany({
      where: { contractItemId: { in: removed.map((item) => item.id) } },
      select: { contractItem: { select: { itemNo: true } } },
      distinct: ['contractItemId'],
    });
    if (removedInUse.length > 0) {
      const itemNos = removedInUse.map((line) => line.contractItem.itemNo).join(', ');
      throw new ConflictException(`Item ${itemNos} ${removedInUse.length === 1 ? 'is' : 'are'} already on an RA bill and can't be removed.`);
    }

    const openBill = contract.bills.find((bill) => OPEN_BILL_STATUSES.includes(bill.status));
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.contractItem.deleteMany({ where: { id: { in: removed.map((item) => item.id) } } });
        for (const [index, item] of dto.items.entries()) {
          if (item.id) await tx.contractItem.update({ where: { id: item.id }, data: itemData(item, index) });
          else await tx.contractItem.create({ data: { ...itemData(item, index), contractId } });
        }
        if (openBill) await this.totals.refresh(tx, openBill.id);
      });
    } catch (error) {
      // Renumbering two lines onto each other's numbers in one save collides mid-way.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Item numbers clash with each other. Save the renumbering in two steps.');
      }
      throw error;
    }
    return this.contracts.findOne(contractId, organizationId);
  }

  private assertUniqueItemNumbers(items: ContractItemDto[]): void {
    const seen = new Set<string>();
    for (const item of items) {
      const key = item.itemNo.toLowerCase();
      if (seen.has(key)) throw new BadRequestException(`Item number ${item.itemNo} appears more than once.`);
      seen.add(key);
    }
  }
}
