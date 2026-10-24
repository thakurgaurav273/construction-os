import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { ImportEntity } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { DataImportService, ImportActor, UploadedSheet } from '../../data-import/data-import.service';
import { RowOutcome, parseRow, rowLabel, validateAgainstDto } from '../../data-import/importers/entity-importer';
import { roundMoney } from '../billing-math';
import { BILL_EVENTS } from '../billing.constants';
import { billCode } from '../contract.mapper';
import { ContractItemsService } from '../contract-items.service';
import { ContractsService } from '../contracts.service';
import { ContractItemDto } from '../dto/contract.dto';
import { BoqImportDto } from '../dto/billing-import.dto';
import { RaBillHistoryService } from '../ra-bill-history.service';
import { normalizeItemNo } from './measurement-book-parser';

interface PlannedLine {
  outcome: RowOutcome;
  item?: ContractItemDto;
  previousQuantity: number;
}

export interface BoqImportView {
  sheetName: string;
  summary: Record<RowOutcome['action'], number>;
  rows: RowOutcome[];
  /** Quantities certified before SitePilot, carried forward as an opening-balance bill. */
  opening: { itemCount: number; quantityLines: number; allowed: boolean; reason: string | null; lastBillNumber: number | null };
}

/**
 * Imports a contract's BOQ from the organization's own sheet. Lines are matched on item number: new ones
 * are added, existing ones updated or skipped. When the sheet carries quantities certified before the
 * contract came into SitePilot, they become one certified opening-balance bill, so the next bill continues
 * the organization's numbering (e.g. RA-04) with the right "previous" quantities.
 */
@Injectable()
export class BoqImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dataImport: DataImportService,
    private readonly contracts: ContractsService,
    private readonly contractItems: ContractItemsService,
    private readonly history: RaBillHistoryService,
  ) {}

  async preview(actor: ImportActor, contractId: string, file: UploadedSheet | undefined, dto: BoqImportDto): Promise<BoqImportView> {
    return (await this.plan(actor, contractId, file, dto)).view;
  }

  async commit(actor: ImportActor, contractId: string, file: UploadedSheet | undefined, dto: BoqImportDto): Promise<BoqImportView> {
    const { view, planned, existing } = await this.plan(actor, contractId, file, dto);
    if (view.summary.error > 0) throw new BadRequestException('Fix the rows with problems first; nothing was imported.');

    const imported = new Map(planned.flatMap((line) => (line.item && line.outcome.action !== 'skip' ? [[normalizeItemNo(line.item.itemNo), line.item]] : [])));
    const merged: ContractItemDto[] = existing.map((item) => imported.get(normalizeItemNo(item.itemNo)) ?? {
      id: item.id, itemNo: item.itemNo, rateCode: item.rateCode, description: item.description, unit: item.unit,
      quantity: item.quantity, rate: item.rate, isExtra: item.isExtra,
    });
    const existingKeys = new Set(existing.map((item) => normalizeItemNo(item.itemNo)));
    merged.push(...planned.flatMap((line) => (line.item && line.outcome.action === 'create' && !existingKeys.has(normalizeItemNo(line.item.itemNo)) ? [line.item] : [])));
    if (imported.size > 0) await this.contractItems.replaceItems(contractId, actor.organizationId, { items: merged });

    if (view.opening.allowed && view.opening.quantityLines > 0 && dto.lastBillNumber) {
      await this.createOpeningBill(actor, contractId, dto.lastBillNumber, planned);
    }
    await this.dataImport.markTemplateUsed(dto.templateId);
    return view;
  }

  private async plan(actor: ImportActor, contractId: string, file: UploadedSheet | undefined, dto: BoqImportDto) {
    const contract = await this.contracts.findContractOrThrow(contractId, actor.organizationId);
    if (contract.status === 'CLOSED') throw new ConflictException('This contract is closed. Reopen it to change the BOQ.');
    const { definition, sheetName, rows } = await this.dataImport.readWithTemplate(actor, dto.templateId, file, dto.sheetName, ImportEntity.BOQ);
    const onExisting = dto.onExisting ?? 'skip';
    const existing = contract.items.map((item) => ({ ...item, quantity: item.quantity.toNumber(), rate: item.rate.toNumber() }));
    const existingByNo = new Map(existing.map((item) => [normalizeItemNo(item.itemNo), item]));
    const seen = new Set<string>();

    const planned: PlannedLine[] = [];
    for (const row of rows) {
      const parsed = parseRow(definition, row);
      const itemNo = parsed.text('itemNo') ?? '';
      const label = rowLabel(itemNo && `${itemNo} · ${parsed.text('description') ?? ''}`, parsed.text('description'));
      const previousQuantity = parsed.number('previousQuantity') ?? 0;
      const key = normalizeItemNo(itemNo);
      if (parsed.errors.length > 0) {
        planned.push({ outcome: { rowNumber: row.rowNumber, label, action: 'error', messages: parsed.errors }, previousQuantity });
        continue;
      }
      if (seen.has(key)) {
        planned.push({ outcome: { rowNumber: row.rowNumber, label, action: 'error', messages: [`Item ${itemNo} appears more than once in the sheet.`] }, previousQuantity });
        continue;
      }
      seen.add(key);
      const match = existingByNo.get(key);
      const rateCode = parsed.text('rateCode') ?? null;
      const { dto: item, errors } = await validateAgainstDto(ContractItemDto, {
        id: match?.id,
        itemNo: match?.itemNo ?? itemNo,
        rateCode,
        description: parsed.text('description'),
        unit: parsed.text('unit'),
        quantity: parsed.number('quantity'),
        rate: parsed.number('rate'),
        isExtra: match?.isExtra ?? /^ns/i.test(rateCode ?? ''),
      }, definition);
      if (errors.length > 0) {
        planned.push({ outcome: { rowNumber: row.rowNumber, label, action: 'error', messages: errors }, previousQuantity });
        continue;
      }
      const action = !match ? 'create' : onExisting === 'update' ? 'update' : 'skip';
      const messages = action === 'skip' ? ['Already in the BOQ; choose "update existing" to overwrite it.'] : [];
      planned.push({ outcome: { rowNumber: row.rowNumber, label, action, messages }, item, previousQuantity });
    }

    const quantityLines = planned.filter((line) => line.item && line.previousQuantity > 0).length;
    const hasBills = contract.bills.some((bill) => bill.status !== 'CANCELLED');
    const reason = quantityLines === 0
      ? null
      : hasBills
        ? 'This contract already has bills, so previous quantities in the sheet are ignored.'
        : dto.lastBillNumber ? null : 'Enter the number of the last bill raised before SitePilot to carry these quantities forward.';
    const outcomes = planned.map((line) => line.outcome);
    const summary = { create: 0, update: 0, skip: 0, error: 0 };
    outcomes.forEach((outcome) => { summary[outcome.action] += 1; });

    return {
      planned,
      existing,
      view: {
        sheetName,
        summary,
        rows: outcomes,
        opening: { itemCount: planned.length, quantityLines, allowed: quantityLines > 0 && !hasBills, reason, lastBillNumber: dto.lastBillNumber ?? null },
      } satisfies BoqImportView,
    };
  }

  /** One certified bill holding everything certified before SitePilot. It is never paid or collected here. */
  private async createOpeningBill(actor: ImportActor, contractId: string, lastBillNumber: number, planned: PlannedLine[]): Promise<void> {
    const contract = await this.contracts.findContractOrThrow(contractId, actor.organizationId);
    const items = new Map(contract.items.map((item) => [normalizeItemNo(item.itemNo), item]));
    const lines = planned.flatMap((line) => {
      const item = line.item && items.get(normalizeItemNo(line.item.itemNo));
      return item && line.previousQuantity > 0 ? [{ item, quantity: line.previousQuantity }] : [];
    });
    const gross = roundMoney(lines.reduce((sum, line) => sum + roundMoney(line.quantity * line.item.rate.toNumber()), 0));
    const today = new Date();

    await this.prisma.$transaction(async (tx) => {
      const bill = await tx.raBill.create({
        data: {
          contractId,
          projectId: contract.projectId,
          organizationId: actor.organizationId,
          sequence: lastBillNumber,
          reference: `Opening balance up to ${billCode(lastBillNumber)}`,
          periodFrom: contract.startDate ?? today,
          periodTo: today,
          status: 'CERTIFIED',
          isOpeningBalance: true,
          notes: 'Quantities certified before this contract was in SitePilot, imported with the BOQ.',
          grossAmount: gross,
          netAmount: gross,
          preparedById: actor.id,
          certifiedById: actor.id,
          submittedAt: today,
          certifiedAt: today,
          lines: {
            create: lines.map((line) => ({
              contractItemId: line.item.id, claimedQuantity: line.quantity, certifiedQuantity: line.quantity, rate: line.item.rate,
            })),
          },
        },
      });
      await this.history.record(tx, {
        bill,
        actorId: actor.id,
        stage: BILL_EVENTS.openingBalance,
        activity: { type: 'update', title: 'Opening balance imported', description: `Bills up to ${billCode(lastBillNumber)} on ${contract.code} were brought in from a spreadsheet.` },
      });
    });
  }
}
