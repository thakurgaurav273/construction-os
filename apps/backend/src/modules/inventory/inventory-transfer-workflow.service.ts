import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Prisma, StockTransfer, StockTransferStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { normalizeOptionalText } from '../../common/utils/normalize-text';
import { num } from './inventory.helpers';
import { InventoryTransfersService } from './inventory-transfers.service';
import { StockLedgerService } from './stock-ledger.service';
import { TransferDetailView } from './transfer.mapper';

const OPEN: StockTransferStatus[] = ['PENDING', 'APPROVED'];
const RECEIVABLE: StockTransferStatus[] = ['APPROVED', 'IN_TRANSIT'];

/**
 * Transfer lifecycle: PENDING → APPROVED → COMPLETED, with REJECTED or CANCELLED as exits before stock moves.
 * Maker-checker: whoever requested a transfer can't approve or reject it. Stock moves only on completion,
 * when the receiving store confirms it arrived.
 */
@Injectable()
export class InventoryTransferWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transfers: InventoryTransfersService,
    private readonly ledger: StockLedgerService,
  ) {}

  async approve(id: string, organizationId: string, userId: string): Promise<TransferDetailView> {
    const transfer = await this.findTransfer(id, organizationId);
    assertNotRequester(transfer, userId, 'approve');
    await this.move(transfer, ['PENDING'], { status: 'APPROVED', approvedById: userId, approvedAt: new Date() });
    return this.transfers.findOne(id, organizationId);
  }

  async reject(id: string, organizationId: string, userId: string, note: string): Promise<TransferDetailView> {
    const transfer = await this.findTransfer(id, organizationId);
    assertNotRequester(transfer, userId, 'reject');
    await this.move(transfer, OPEN, { status: 'REJECTED', reviewNote: note.trim() });
    return this.transfers.findOne(id, organizationId);
  }

  async cancel(id: string, organizationId: string, userId: string, note?: string): Promise<TransferDetailView> {
    const transfer = await this.findTransfer(id, organizationId);
    if (transfer.requestedById !== userId) {
      throw new ForbiddenException('Only the person who requested this transfer can cancel it. Reject it instead.');
    }
    await this.move(transfer, OPEN, { status: 'CANCELLED', reviewNote: normalizeOptionalText(note) ?? null });
    return this.transfers.findOne(id, organizationId);
  }

  /** The receiving store confirms arrival: stock leaves the origin and lands at the destination in one transaction. */
  async complete(id: string, organizationId: string, userId: string): Promise<TransferDetailView> {
    const transfer = await this.findTransfer(id, organizationId);
    if (transfer.status === 'PENDING') throw new BadRequestException('Approve this transfer before receiving it.');

    await this.prisma.$transaction(async (tx) => {
      // Claiming the transfer first means a second "receive" click finds nothing to move.
      await this.claim(tx, transfer, RECEIVABLE, { status: 'COMPLETED', completedById: userId, completedAt: new Date() });
      const lines = await tx.stockTransferItem.findMany({ where: { transferId: transfer.id } });
      for (const line of lines) {
        await this.ledger.transferBetweenStores(tx, {
          organizationId,
          fromWarehouseId: transfer.fromWarehouseId,
          toWarehouseId: transfer.toWarehouseId,
          materialId: line.materialId,
          quantity: num(line.quantity),
          reference: transfer.code,
          transferId: transfer.id,
        });
      }
    });
    return this.transfers.findOne(id, organizationId);
  }

  private async findTransfer(id: string, organizationId: string): Promise<StockTransfer> {
    const transfer = await this.prisma.stockTransfer.findFirst({ where: { id, organizationId } });
    if (!transfer) throw new NotFoundException('Transfer not found');
    return transfer;
  }

  private async move(
    transfer: StockTransfer,
    from: StockTransferStatus[],
    data: Prisma.StockTransferUncheckedUpdateManyInput,
  ): Promise<void> {
    await this.claim(this.prisma, transfer, from, data);
  }

  /** Conditional update so two people acting on the same transfer can't both win. */
  private async claim(
    client: Prisma.TransactionClient,
    transfer: StockTransfer,
    from: StockTransferStatus[],
    data: Prisma.StockTransferUncheckedUpdateManyInput,
  ): Promise<void> {
    const { count } = await client.stockTransfer.updateMany({
      where: { id: transfer.id, status: { in: from } },
      data,
    });
    if (count === 0) {
      throw new ConflictException(`${transfer.code} is ${transfer.status.toLowerCase().replace('_', ' ')} and can't be changed this way.`);
    }
  }
}

function assertNotRequester(transfer: StockTransfer, userId: string, action: string): void {
  if (transfer.requestedById === userId) {
    throw new ForbiddenException(`You requested ${transfer.code}, so someone else has to ${action} it.`);
  }
}
