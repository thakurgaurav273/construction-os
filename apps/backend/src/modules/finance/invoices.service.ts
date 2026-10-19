import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Invoice, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { formatRupees } from '../procurement/purchase-order-history.service';
import { CreateInvoiceDto, InvoiceItemDto, InvoiceQueryDto, UpdateInvoiceDto } from './dto/invoice.dto';
import { EDITABLE_INVOICE_STATUSES } from './finance.constants';
import { FinanceHistoryService } from './finance-history.service';
import { BillableLine, InvoiceMatchService } from './invoice-match.service';
import {
  INVOICE_DETAIL_INCLUDE, INVOICE_LIST_INCLUDE, InvoiceDetailView, InvoiceView, invoiceTotals, toInvoiceDetailView,
  toInvoiceView,
} from './invoice.mapper';

interface ResolvedInvoice {
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  projectId: string;
  purchaseOrderId: string | null;
  category: string;
  issuedDate: Date;
  dueDate: Date;
  items: InvoiceItemDto[];
}

interface InvoiceHeader {
  invoiceNumber: string;
  vendorId: string;
  vendorName: string;
  projectId: string;
  purchaseOrderId: string | null;
  category: string;
  issuedDate: Date;
  dueDate: Date;
  description: string;
  notes: string;
}

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly matcher: InvoiceMatchService,
    private readonly history: FinanceHistoryService,
  ) {}

  async findAll(organizationId: string, query: InvoiceQueryDto): Promise<InvoiceView[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        organizationId,
        status: query.status,
        vendorId: query.vendorId,
        projectId: query.projectId,
        purchaseOrderId: query.purchaseOrderId,
      },
      include: INVOICE_LIST_INCLUDE,
      orderBy: [{ issuedDate: 'desc' }, { createdAt: 'desc' }],
    });
    const matches = await this.matcher.matchInvoices(invoices);
    const today = new Date();
    return invoices.map((invoice) => toInvoiceView(invoice, matches.get(invoice.id)?.status ?? 'NO_PO', today));
  }

  async findOne(id: string, organizationId: string): Promise<InvoiceDetailView> {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, organizationId }, include: INVOICE_DETAIL_INCLUDE });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    const [matches, timeline] = await Promise.all([
      this.matcher.matchInvoices([invoice]),
      this.history.timeline(id, organizationId),
    ]);
    const match = matches.get(id) ?? { status: 'NO_PO' as const, lines: [] };
    return toInvoiceDetailView(invoice, match, timeline, new Date());
  }

  billableLines(purchaseOrderId: string, organizationId: string): Promise<BillableLine[]> {
    return this.matcher.billableLines(purchaseOrderId, organizationId);
  }

  async create(organizationId: string, userId: string, dto: CreateInvoiceDto): Promise<InvoiceDetailView> {
    const resolved = await this.resolve(organizationId, dto);
    const totals = invoiceTotals(resolved.items);

    const invoice = await this.withUniqueNumber(resolved, () => this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          ...this.headerData(resolved, dto),
          ...totals,
          organizationId,
          createdById: userId,
          items: { create: toItemRows(resolved.items) },
        },
      });
      await this.history.record(tx, {
        invoice: created,
        actorId: userId,
        type: 'update',
        title: 'Vendor invoice recorded',
        description: `${created.invoiceNumber} from ${created.vendorName} for ${formatRupees(totals.totalAmount)} was recorded.`,
      });
      return created;
    }));
    return this.findOne(invoice.id, organizationId);
  }

  async update(id: string, organizationId: string, dto: UpdateInvoiceDto): Promise<InvoiceDetailView> {
    const existing = await this.prisma.invoice.findFirst({ where: { id, organizationId }, include: { items: { orderBy: { sortOrder: 'asc' } } } });
    if (!existing) throw new NotFoundException('Invoice not found.');
    if (!EDITABLE_INVOICE_STATUSES.includes(existing.status)) {
      throw new ConflictException('Only draft invoices can be edited.');
    }

    const resolved = await this.resolve(organizationId, {
      invoiceNumber: dto.invoiceNumber ?? existing.invoiceNumber,
      vendorId: dto.vendorId ?? existing.vendorId ?? '',
      projectId: dto.projectId ?? existing.projectId ?? undefined,
      // An explicit null-equivalent isn't expressible in the DTO, so keep the PO unless a new one is sent.
      purchaseOrderId: dto.purchaseOrderId ?? existing.purchaseOrderId ?? undefined,
      category: dto.category ?? existing.category,
      issuedDate: dto.issuedDate ?? existing.issuedDate.toISOString().slice(0, 10),
      dueDate: dto.dueDate ?? existing.dueDate.toISOString().slice(0, 10),
      items: dto.items ?? existing.items.map((item) => ({
        poLineItemId: item.poLineItemId ?? undefined,
        description: item.description,
        unit: item.unit,
        quantity: Number(item.quantity),
        rate: Number(item.rate),
        taxPercent: item.taxPercent,
      })),
    });

    await this.withUniqueNumber(resolved, () => this.prisma.$transaction(async (tx) => {
      const { count } = await tx.invoice.updateMany({
        where: { id, status: { in: EDITABLE_INVOICE_STATUSES } },
        data: { ...this.headerData(resolved, dto, existing), ...invoiceTotals(resolved.items) },
      });
      if (count === 0) throw new ConflictException('This invoice was just submitted. Refresh to see the latest.');
      if (dto.items) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: id } });
        await tx.invoiceItem.createMany({ data: toItemRows(resolved.items).map((row) => ({ ...row, invoiceId: id })) });
      }
    }));
    return this.findOne(id, organizationId);
  }

  async findInvoiceOrThrow(id: string, organizationId: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findFirst({ where: { id, organizationId } });
    if (!invoice) throw new NotFoundException('Invoice not found.');
    return invoice;
  }

  /** Validates references and derives vendor/project from the purchase order when the bill is against one. */
  private async resolve(organizationId: string, dto: CreateInvoiceDto): Promise<ResolvedInvoice> {
    const vendor = await this.prisma.vendor.findFirst({ where: { id: dto.vendorId, organizationId }, select: { id: true, name: true } });
    if (!vendor) throw new NotFoundException('Vendor not found.');

    const issuedDate = new Date(dto.issuedDate);
    const dueDate = new Date(dto.dueDate);
    if (dueDate < issuedDate) throw new BadRequestException("The due date can't be before the invoice date.");

    if (!dto.purchaseOrderId) {
      if (dto.items.some((item) => item.poLineItemId)) {
        throw new BadRequestException('Choose the purchase order before linking lines to it.');
      }
      if (!dto.projectId) throw new BadRequestException('Choose the project this bill is charged to.');
      const project = await this.prisma.project.findFirst({ where: { id: dto.projectId, organizationId }, select: { id: true } });
      if (!project) throw new NotFoundException('Project not found.');
      return {
        invoiceNumber: dto.invoiceNumber.trim(), vendorId: vendor.id, vendorName: vendor.name, projectId: project.id,
        purchaseOrderId: null, category: dto.category?.trim() || 'General', issuedDate, dueDate, items: dto.items,
      };
    }

    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id: dto.purchaseOrderId, organizationId },
      select: { id: true, poNumber: true, status: true, vendorId: true, projectId: true, category: true, items: { select: { id: true } } },
    });
    if (!order) throw new NotFoundException('Purchase order not found.');
    if (order.status !== 'APPROVED') throw new BadRequestException(`${order.poNumber} isn't approved, so it can't be billed yet.`);
    if (order.vendorId !== vendor.id) throw new BadRequestException(`${order.poNumber} was placed with a different vendor.`);
    if (!order.projectId) throw new BadRequestException(`${order.poNumber} has no project.`);
    if (dto.projectId && dto.projectId !== order.projectId) {
      throw new BadRequestException(`${order.poNumber} belongs to a different project.`);
    }

    const orderLineIds = new Set(order.items.map((item) => item.id));
    const linked = dto.items.map((item) => item.poLineItemId).filter((lineId): lineId is string => !!lineId);
    if (linked.some((lineId) => !orderLineIds.has(lineId))) {
      throw new BadRequestException(`A line doesn't belong to ${order.poNumber}.`);
    }
    if (new Set(linked).size !== linked.length) throw new BadRequestException('Each PO line can appear only once on an invoice.');

    return {
      invoiceNumber: dto.invoiceNumber.trim(), vendorId: vendor.id, vendorName: vendor.name, projectId: order.projectId,
      purchaseOrderId: order.id, category: dto.category?.trim() || order.category, issuedDate, dueDate, items: dto.items,
    };
  }

  private headerData(resolved: ResolvedInvoice, dto: UpdateInvoiceDto, existing?: Invoice): InvoiceHeader {
    return {
      invoiceNumber: resolved.invoiceNumber,
      vendorId: resolved.vendorId,
      vendorName: resolved.vendorName,
      projectId: resolved.projectId,
      purchaseOrderId: resolved.purchaseOrderId,
      category: resolved.category,
      issuedDate: resolved.issuedDate,
      dueDate: resolved.dueDate,
      description: dto.description?.trim() ?? existing?.description ?? '',
      notes: dto.notes?.trim() ?? existing?.notes ?? '',
    };
  }

  /** The vendor's bill number is unique per vendor; a clash means the bill was already entered. */
  private async withUniqueNumber<T>(resolved: ResolvedInvoice, write: () => Promise<T>): Promise<T> {
    try {
      return await write();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Invoice ${resolved.invoiceNumber} from ${resolved.vendorName} is already recorded.`);
      }
      throw error;
    }
  }
}

function toItemRows(items: InvoiceItemDto[]): Omit<Prisma.InvoiceItemCreateManyInput, 'invoiceId'>[] {
  return items.map((item, index) => ({
    poLineItemId: item.poLineItemId ?? null,
    description: item.description.trim(),
    unit: item.unit.trim(),
    quantity: item.quantity,
    rate: item.rate,
    taxPercent: item.taxPercent,
    sortOrder: index,
  }));
}
