import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, RaBillStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { formatRupees } from '../procurement/purchase-order-history.service';
import { BILL_EVENTS, EDITABLE_BILL_STATUSES, OPEN_BILL_STATUSES } from './billing.constants';
import { billCode } from './contract.mapper';
import { BillNoteDto, CertifyRaBillDto, RequiredBillNoteDto } from './dto/ra-bill.dto';
import { BillHistoryEntry, RaBillHistoryService } from './ra-bill-history.service';
import { RaBillTotalsService } from './ra-bill-totals.service';
import { DetailBill, RaBillDetailView } from './ra-bill.mapper';
import { RaBillsService } from './ra-bills.service';

interface BillTransition {
  bill: DetailBill;
  actorId: string;
  from: RaBillStatus[];
  to: RaBillStatus;
  changes?: Omit<Prisma.RaBillUncheckedUpdateManyInput, 'status'>;
  stage: string;
  note?: string;
  activity: NonNullable<BillHistoryEntry['activity']>;
  /** Extra writes that must commit together with the status change. */
  onTransition?: (tx: Prisma.TransactionClient) => Promise<unknown>;
}

/**
 * RA bill lifecycle: DRAFT → SUBMITTED → CERTIFIED, or SUBMITTED → CHANGES_REQUESTED → (edit) → SUBMITTED.
 * Open bills can be CANCELLED. On a client contract, certifying records the client's decision. On a
 * subcontract, certifying approves money we owe, so it is maker-checker: whoever prepared the bill can't certify it.
 */
@Injectable()
export class RaBillWorkflowService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bills: RaBillsService,
    private readonly totals: RaBillTotalsService,
    private readonly history: RaBillHistoryService,
  ) {}

  async submit(id: string, organizationId: string, userId: string): Promise<RaBillDetailView> {
    const bill = await this.bills.findBillOrThrow(id, organizationId);
    if (!EDITABLE_BILL_STATUSES.includes(bill.status)) throw new ConflictException('Only drafts and bills sent back for changes can be submitted.');
    if (bill.contract.status === 'CLOSED') throw new ConflictException('This contract is closed.');
    if (!bill.lines.some((line) => line.claimedQuantity.toNumber() > 0)) {
      throw new BadRequestException('Measure at least one BOQ item before submitting.');
    }
    const toClient = bill.contract.direction === 'CLIENT';
    await this.transition({
      bill,
      actorId: userId,
      from: EDITABLE_BILL_STATUSES,
      to: 'SUBMITTED',
      changes: { submittedAt: new Date(), reviewNote: null },
      stage: BILL_EVENTS.submitted,
      note: bill.status === 'CHANGES_REQUESTED' ? 'Resubmitted after changes' : '',
      activity: {
        type: 'update',
        title: toClient ? 'RA bill submitted to client' : 'RA bill submitted for certification',
        description: `${this.label(bill)} for ${formatRupees(bill.grossAmount.toNumber())} (gross) is awaiting certification.`,
      },
    });
    return this.bills.findOne(id, organizationId);
  }

  /** Lines left out are certified as claimed. Certifying less than claimed holds the difference back. */
  async certify(id: string, organizationId: string, userId: string, dto: CertifyRaBillDto): Promise<RaBillDetailView> {
    const bill = await this.findSubmittedBill(id, organizationId);
    if (bill.contract.direction === 'SUBCONTRACT' && bill.preparedById === userId) {
      throw new ForbiddenException("You can't certify a subcontractor bill you prepared. Ask another certifier.");
    }
    const decisions = new Map((dto.lines ?? []).map((line) => [line.contractItemId, line]));
    const lineItemIds = new Set(bill.lines.map((line) => line.contractItemId));
    if ([...decisions.keys()].some((itemId) => !lineItemIds.has(itemId))) {
      throw new BadRequestException('Only items claimed on this bill can be certified.');
    }
    const rates = new Map(bill.contract.items.map((item) => [item.id, item]));
    for (const line of bill.lines) {
      const certified = decisions.get(line.contractItemId)?.certifiedQuantity;
      if (certified !== undefined && certified > line.claimedQuantity.toNumber()) {
        throw new BadRequestException(`Item ${rates.get(line.contractItemId)?.itemNo}: certified quantity can't exceed the claim.`);
      }
    }

    await this.transition({
      bill,
      actorId: userId,
      from: ['SUBMITTED'],
      to: 'CERTIFIED',
      changes: { certifiedById: userId, certifiedAt: new Date(), reviewNote: dto.note?.trim() || null },
      stage: BILL_EVENTS.certified,
      note: dto.note,
      activity: { type: 'approval', title: 'RA bill certified', description: `${this.label(bill)} was certified.` },
      onTransition: async (tx) => {
        for (const line of bill.lines) {
          const decision = decisions.get(line.contractItemId);
          await tx.raBillLine.update({
            where: { id: line.id },
            data: {
              certifiedQuantity: decision?.certifiedQuantity ?? line.claimedQuantity,
              certificationNote: decision?.note?.trim() || null,
              rate: rates.get(line.contractItemId)?.rate,
            },
          });
        }
        await this.totals.refresh(tx, id);
      },
    });
    return this.bills.findOne(id, organizationId);
  }

  async requestChanges(id: string, organizationId: string, userId: string, dto: RequiredBillNoteDto): Promise<RaBillDetailView> {
    const bill = await this.findSubmittedBill(id, organizationId);
    const note = dto.note.trim();
    await this.transition({
      bill,
      actorId: userId,
      from: ['SUBMITTED'],
      to: 'CHANGES_REQUESTED',
      changes: { reviewNote: note },
      stage: BILL_EVENTS.changesRequested,
      note,
      activity: { type: 'alert', title: 'RA bill sent back', description: `${this.label(bill)} was sent back: ${note}` },
    });
    return this.bills.findOne(id, organizationId);
  }

  /** The preparer can withdraw their own open bill; anyone else's needs certifier rights. */
  async cancel(id: string, organizationId: string, userId: string, dto: BillNoteDto, isCertifier: boolean): Promise<RaBillDetailView> {
    const bill = await this.bills.findBillOrThrow(id, organizationId);
    if (!OPEN_BILL_STATUSES.includes(bill.status)) throw new ConflictException('Only open bills can be cancelled.');
    if (bill.preparedById !== userId && !isCertifier) {
      throw new ForbiddenException('Only whoever prepared this bill or a certifier can cancel it.');
    }
    const note = dto.note?.trim();
    await this.transition({
      bill,
      actorId: userId,
      from: OPEN_BILL_STATUSES,
      to: 'CANCELLED',
      stage: BILL_EVENTS.cancelled,
      note,
      activity: { type: 'alert', title: 'RA bill cancelled', description: note ? `${this.label(bill)} was cancelled: ${note}` : `${this.label(bill)} was cancelled.` },
    });
    return this.bills.findOne(id, organizationId);
  }

  private label(bill: DetailBill): string {
    return `${billCode(bill.sequence)} on ${bill.contract.code}`;
  }

  private async findSubmittedBill(id: string, organizationId: string): Promise<DetailBill> {
    const bill = await this.bills.findBillOrThrow(id, organizationId);
    if (bill.status !== 'SUBMITTED') throw new ConflictException('Only submitted bills can be certified or sent back.');
    return bill;
  }

  private async transition({ bill, actorId, from, to, changes, stage, note, activity, onTransition }: BillTransition): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Matching on the expected status stops two people acting on the same bill at once.
      const { count } = await tx.raBill.updateMany({ where: { id: bill.id, status: { in: from } }, data: { ...changes, status: to } });
      if (count === 0) throw new ConflictException('This bill was just updated by someone else. Refresh and try again.');
      await onTransition?.(tx);
      await this.history.record(tx, { bill, actorId, stage, note, activity });
    });
  }
}
