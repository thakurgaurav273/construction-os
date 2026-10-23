import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { roundMoney, toNumber } from '../procurement/procurement-math';
import { ACTIVE_INVOICE_STATUSES, RATE_TOLERANCE_PERCENT } from './finance.constants';

export type MatchIssue = 'QTY_EXCEEDS_RECEIVED' | 'RATE_ABOVE_PO' | 'TAX_MISMATCH' | 'NOT_ON_PO';
/** NO_PO: a bill without a purchase order (labour, services, utilities) has nothing to match against. */
export type MatchStatus = 'MATCHED' | 'VARIANCE' | 'NO_PO';

export interface MatchLine {
  invoiceItemId: string;
  poLineItemId: string | null;
  orderedQuantity: number | null;
  receivedQuantity: number | null;
  /** Quantity of this PO line already on other active invoices. */
  billedElsewhere: number | null;
  /** Received but not yet billed, before this invoice. */
  billableQuantity: number | null;
  invoicedQuantity: number;
  /** PO rate after the line discount. */
  poRate: number | null;
  invoicedRate: number;
  poTaxPercent: number | null;
  invoicedTaxPercent: number;
  issues: MatchIssue[];
}

export interface InvoiceMatch {
  status: MatchStatus;
  lines: MatchLine[];
}

export interface BillableLine {
  poLineItemId: string;
  description: string;
  unit: string;
  orderedQuantity: number;
  receivedQuantity: number;
  billedQuantity: number;
  billableQuantity: number;
  rate: number;
  taxPercent: number;
}

interface MatchableInvoice {
  id: string;
  purchaseOrderId: string | null;
  items: { id: string; poLineItemId: string | null; quantity: Prisma.Decimal | number; rate: Prisma.Decimal | number; taxPercent: number }[];
}

interface PoLineFacts {
  quantity: number;
  receivedQuantity: number;
  effectiveRate: number;
  taxPercent: number;
}

const roundQuantity = (value: number): number => Math.round(value * 1000) / 1000;

/** Rate the vendor agreed to on the PO, after the line discount. */
function effectiveRate(rate: number, discountPercent: number): number {
  return roundMoney(rate * (1 - discountPercent / 100));
}

/**
 * Three-way match per line: the PO says what was agreed, the GRNs say what arrived, the bill says what is
 * being charged. A line is clean when it bills no more than was received and not yet billed, at no more
 * than the PO rate (within tolerance), with the same GST.
 */
export function matchLines(
  invoice: MatchableInvoice,
  poLines: Map<string, PoLineFacts>,
  billedByLine: Map<string, { invoiceId: string; quantity: number }[]>,
): InvoiceMatch {
  if (!invoice.purchaseOrderId) {
    return {
      status: 'NO_PO',
      lines: invoice.items.map((item) => ({
        invoiceItemId: item.id, poLineItemId: null, orderedQuantity: null, receivedQuantity: null, billedElsewhere: null,
        billableQuantity: null, invoicedQuantity: toNumber(item.quantity), poRate: null, invoicedRate: toNumber(item.rate),
        poTaxPercent: null, invoicedTaxPercent: item.taxPercent, issues: [],
      })),
    };
  }

  const lines = invoice.items.map((item): MatchLine => {
    const invoicedQuantity = toNumber(item.quantity);
    const invoicedRate = toNumber(item.rate);
    const poLine = item.poLineItemId ? poLines.get(item.poLineItemId) : undefined;
    if (!item.poLineItemId || !poLine) {
      return {
        invoiceItemId: item.id, poLineItemId: null, orderedQuantity: null, receivedQuantity: null, billedElsewhere: null,
        billableQuantity: null, invoicedQuantity, poRate: null, invoicedRate, poTaxPercent: null,
        invoicedTaxPercent: item.taxPercent, issues: ['NOT_ON_PO'],
      };
    }

    const billedElsewhere = roundQuantity((billedByLine.get(item.poLineItemId) ?? [])
      .filter((entry) => entry.invoiceId !== invoice.id)
      .reduce((sum, entry) => sum + entry.quantity, 0));
    const billableQuantity = roundQuantity(Math.max(0, poLine.receivedQuantity - billedElsewhere));
    const issues: MatchIssue[] = [];
    if (invoicedQuantity > billableQuantity) issues.push('QTY_EXCEEDS_RECEIVED');
    if (invoicedRate > roundMoney(poLine.effectiveRate * (1 + RATE_TOLERANCE_PERCENT / 100))) issues.push('RATE_ABOVE_PO');
    if (Math.abs(item.taxPercent - poLine.taxPercent) > 0.001) issues.push('TAX_MISMATCH');

    return {
      invoiceItemId: item.id,
      poLineItemId: item.poLineItemId,
      orderedQuantity: poLine.quantity,
      receivedQuantity: poLine.receivedQuantity,
      billedElsewhere,
      billableQuantity,
      invoicedQuantity,
      poRate: poLine.effectiveRate,
      invoicedRate,
      poTaxPercent: poLine.taxPercent,
      invoicedTaxPercent: item.taxPercent,
      issues,
    };
  });

  return { status: lines.some((line) => line.issues.length > 0) ? 'VARIANCE' : 'MATCHED', lines };
}

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class InvoiceMatchService {
  constructor(private readonly prisma: PrismaService) {}

  async matchInvoices(invoices: MatchableInvoice[], db: Db = this.prisma): Promise<Map<string, InvoiceMatch>> {
    const lineIds = [...new Set(invoices.flatMap((invoice) => invoice.items.map((item) => item.poLineItemId)).filter(isString))];
    const { poLines, billedByLine } = await this.loadLineFacts(lineIds, db);
    return new Map(invoices.map((invoice) => [invoice.id, matchLines(invoice, poLines, billedByLine)]));
  }

  /** What can still be billed on each line of a purchase order, for prefilling a new invoice. */
  async billableLines(purchaseOrderId: string, organizationId: string): Promise<BillableLine[]> {
    const lines = await this.prisma.poLineItem.findMany({
      where: { purchaseOrderId, purchaseOrder: { organizationId } },
      orderBy: { sortOrder: 'asc' },
    });
    const { billedByLine } = await this.loadLineFacts(lines.map((line) => line.id), this.prisma);

    return lines.map((line) => {
      const receivedQuantity = toNumber(line.receivedQuantity);
      const billedQuantity = roundQuantity((billedByLine.get(line.id) ?? []).reduce((sum, entry) => sum + entry.quantity, 0));
      return {
        poLineItemId: line.id,
        description: line.description,
        unit: line.unit,
        orderedQuantity: toNumber(line.quantity),
        receivedQuantity,
        billedQuantity,
        billableQuantity: roundQuantity(Math.max(0, receivedQuantity - billedQuantity)),
        rate: effectiveRate(toNumber(line.rate), line.discountPercent),
        taxPercent: line.taxPercent,
      };
    });
  }

  private async loadLineFacts(lineIds: string[], db: Db): Promise<{
    poLines: Map<string, PoLineFacts>;
    billedByLine: Map<string, { invoiceId: string; quantity: number }[]>;
  }> {
    if (lineIds.length === 0) return { poLines: new Map(), billedByLine: new Map() };

    const [lines, billed] = await Promise.all([
      db.poLineItem.findMany({ where: { id: { in: lineIds } } }),
      db.invoiceItem.findMany({
        where: { poLineItemId: { in: lineIds }, invoice: { status: { in: ACTIVE_INVOICE_STATUSES } } },
        select: { poLineItemId: true, invoiceId: true, quantity: true },
      }),
    ]);

    const poLines = new Map(lines.map((line) => [line.id, {
      quantity: toNumber(line.quantity),
      receivedQuantity: toNumber(line.receivedQuantity),
      effectiveRate: effectiveRate(toNumber(line.rate), line.discountPercent),
      taxPercent: line.taxPercent,
    }]));

    const billedByLine = new Map<string, { invoiceId: string; quantity: number }[]>();
    for (const entry of billed) {
      if (!entry.poLineItemId) continue;
      const list = billedByLine.get(entry.poLineItemId) ?? [];
      list.push({ invoiceId: entry.invoiceId, quantity: toNumber(entry.quantity) });
      billedByLine.set(entry.poLineItemId, list);
    }
    return { poLines, billedByLine };
  }
}

function isString(value: string | null): value is string {
  return value !== null;
}
