import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { formatRupees } from '../procurement/purchase-order-history.service';
import { isFutureDay } from '../procurement/procurement-math';
import { roundMoney } from './billing-math';
import { billCode } from './contract.mapper';
import { RecordReceiptDto, VoidReceiptDto } from './dto/settlement.dto';
import { RaBillHistoryService } from './ra-bill-history.service';

/** Money received from clients against certified client bills. A mistaken receipt is voided, never deleted. */
@Injectable()
export class RaBillReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly history: RaBillHistoryService,
  ) {}

  async record(billId: string, organizationId: string, userId: string, dto: RecordReceiptDto): Promise<void> {
    const receivedDate = new Date(dto.receivedDate);
    if (isFutureDay(receivedDate)) throw new BadRequestException("The date received can't be in the future.");

    await this.prisma.$transaction(async (tx) => {
      // Lock the bill so two receipts can't both claim the same outstanding balance.
      await tx.$queryRaw`SELECT id FROM ra_bills WHERE id = ${billId} AND "organizationId" = ${organizationId} FOR UPDATE`;
      const bill = await tx.raBill.findFirst({
        where: { id: billId, organizationId },
        include: { contract: { select: { direction: true, code: true } }, receipts: { where: { voidedAt: null }, select: { amount: true } } },
      });
      if (!bill) throw new NotFoundException('RA bill not found.');
      if (bill.contract.direction !== 'CLIENT') throw new BadRequestException('Subcontract bills are paid through Finance, not recorded here.');
      if (bill.status !== 'CERTIFIED') throw new ConflictException('Record receipts once the client has certified the bill.');

      const received = bill.receipts.reduce((sum, receipt) => sum + receipt.amount.toNumber(), 0);
      const outstanding = roundMoney(bill.netAmount.toNumber() - received);
      if (dto.amount > outstanding + 0.005) {
        throw new BadRequestException(outstanding <= 0 ? 'This bill is already fully received.' : `Only ${formatRupees(outstanding)} is outstanding on this bill.`);
      }

      await tx.raBillReceipt.create({
        data: {
          billId,
          amount: dto.amount,
          receivedDate,
          method: dto.method ?? 'bank_transfer',
          reference: dto.reference ?? '',
          notes: dto.notes?.trim() ?? '',
          recordedById: userId,
        },
      });
      const label = `${billCode(bill.sequence)} on ${bill.contract.code}`;
      await this.history.record(tx, {
        bill,
        actorId: userId,
        stage: `Received ${formatRupees(dto.amount)}`,
        note: dto.reference ? `Ref ${dto.reference}` : '',
        activity: { type: 'update', title: 'Client payment received', description: `${formatRupees(dto.amount)} received against ${label}.` },
      });
    });
  }

  async void(billId: string, receiptId: string, organizationId: string, userId: string, dto: VoidReceiptDto): Promise<void> {
    const receipt = await this.prisma.raBillReceipt.findFirst({
      where: { id: receiptId, billId, bill: { organizationId } },
      include: { bill: true },
    });
    if (!receipt) throw new NotFoundException('Receipt not found.');
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.raBillReceipt.updateMany({
        where: { id: receiptId, voidedAt: null },
        data: { voidedAt: new Date(), voidedById: userId, voidNote: dto.note },
      });
      if (count === 0) throw new ConflictException('This receipt is already voided.');
      await this.history.record(tx, { bill: receipt.bill, actorId: userId, stage: `Voided receipt of ${formatRupees(receipt.amount.toNumber())}`, note: dto.note });
    });
  }
}
